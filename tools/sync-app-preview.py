#!/usr/bin/env python3
"""Publish the home screen of the newest Amsterdam Families test build to the
Home CMS preview (GBNinon/AF-marketing, folder app-preview/).

Run on the Mac VM (Cowork device shell):
    python3 "$HOME/mnt/Families apps/families-marketing/sync-app-preview.py"
Options:
    --zip PATH      use this zip instead of the newest ams-test-v*.zip
    --out DIR       only build into DIR, do not commit or push (for testing)

What it does
1. Finds the newest "ams-test-vX.YY.zip" in "Amsterdam Families/2 UPDATE v1.1 in test".
2. Copies www/index.html plus every asset the home needs (scripts, fonts, images it names).
3. Adds the preview shim to index.html: it skips onboarding and the account sheet,
   switches language, and answers the three CMS settings with the CMS draft.
4. Writes app-preview/version.json and pushes to GitHub with Families apps/github-token.txt.
"""
import argparse, datetime, json, os, re, shutil, subprocess, sys, tempfile, zipfile

HOME = os.path.expanduser('~')
ROOT = os.path.join(HOME, 'mnt', 'Families apps')
TEST_DIR = os.path.join(ROOT, 'Amsterdam Families', '2 UPDATE v1.1 in test')
TOKEN_FILE = os.path.join(ROOT, 'github-token.txt')
REPO = 'GBNinon/AF-marketing'
WORK = os.path.join(HOME, 'work', 'AF-marketing')

SHIM = """<script>/* CMS preview shim, added by sync-app-preview.py. Only active inside the Home CMS. */
(function(){try{var P=window.parent;if(!P||P===window)return;
try{sessionStorage.setItem('ams-nudge-done','1');}catch(e){}
localStorage.setItem('onboarding_done','1');localStorage.setItem('ams-landed','1');localStorage.removeItem('ams-tour-pending');
if(P.__cmsLang)localStorage.setItem('ams-lang',P.__cmsLang);
var of=window.fetch;window.fetch=function(u,o){var d=P.__cmsDraft,m=String(u&&u.url||u).match(/config_key=eq\\.(ams_home_(?:slides|tiles|badges))/);
if(d&&m&&d[m[1]]!==undefined)return Promise.resolve(new Response(JSON.stringify([{config_value:d[m[1]]}]),{status:200,headers:{'Content-Type':'application/json'}}));
return of.apply(this,arguments);};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(a&&a.getAttribute('href').charAt(0)!=='#'){e.preventDefault();e.stopPropagation();}},true);
}catch(e){}})();</script>
"""
ASSET_RE = re.compile(r"assets/[A-Za-z0-9_./-]+\.(?:js|css|webp|png|jpe?g|svg|gif|woff2?|json)")


def ver_key(name):
    m = re.search(r'v(\d+)\.(\d+)', name)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def newest_zip():
    zips = [f for f in os.listdir(TEST_DIR) if re.match(r'ams-test-v[\d.]+\.zip$', f)]
    if not zips:
        sys.exit('No ams-test-v*.zip found in ' + TEST_DIR)
    return os.path.join(TEST_DIR, max(zips, key=ver_key))


def build(zip_path, out):
    z = zipfile.ZipFile(zip_path)
    names = set(z.namelist())
    def read(p):
        return z.read('www/' + p).decode('utf-8', 'replace')
    need, todo = set(), ['index.html']
    while todo:  # follow asset references from index.html into the scripts and css it loads
        p = todo.pop()
        if p in need or 'www/' + p not in names:
            continue
        need.add(p)
        if p.endswith(('.html', '.js', '.css')):
            text = read(p)
            todo += ASSET_RE.findall(text)
            if p.endswith('.css'):  # url(../fonts/x.woff2) relative to the css file
                base = os.path.dirname(p)
                for u in re.findall(r"url\(['\"]?([^'\")]+)", text):
                    if not u.startswith(('http', 'data:')):
                        todo.append(os.path.normpath(os.path.join(base, u)))
    if os.path.exists(out):
        shutil.rmtree(out)
    for p in sorted(need):
        dst = os.path.join(out, p)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as f:
            f.write(z.read('www/' + p))
    idx = os.path.join(out, 'index.html')
    html = open(idx, encoding='utf-8').read()
    html = re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + '\n' + SHIM, html, count=1)
    open(idx, 'w', encoding='utf-8').write(html)
    info = z.getinfo('www/index.html')
    version = re.search(r'v([\d.]+)\.zip$', zip_path).group(1)
    meta = {'version': version, 'zip': os.path.basename(zip_path),
            'built': datetime.date(*info.date_time[:3]).isoformat(),
            'synced': datetime.datetime.now().isoformat(timespec='minutes'),
            'files': len(need)}
    json.dump(meta, open(os.path.join(out, 'version.json'), 'w'), indent=1)
    return meta


def git(*args, cwd=WORK, token=''):
    r = subprocess.run(['git', *args], cwd=cwd, capture_output=True, text=True)
    out = (r.stdout + r.stderr).replace(token, '<token>') if token else r.stdout + r.stderr
    if r.returncode != 0:
        sys.exit('git ' + args[0] + ' failed: ' + out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zip'); ap.add_argument('--out')
    a = ap.parse_args()
    zip_path = a.zip or newest_zip()
    if a.out:
        print(build(zip_path, a.out)); return
    token = open(TOKEN_FILE).read().strip()
    url = 'https://x-access-token:%s@github.com/%s' % (token, REPO)
    if os.path.isdir(os.path.join(WORK, '.git')):
        git('remote', 'set-url', 'origin', url, token=token); git('fetch', '-q', 'origin', 'main', token=token); git('reset', '-q', '--hard', 'origin/main', token=token)
    else:
        os.makedirs(os.path.dirname(WORK), exist_ok=True)
        git('clone', '-q', '--depth', '5', url, WORK, cwd=os.path.dirname(WORK), token=token)
    meta = build(zip_path, os.path.join(WORK, 'app-preview'))
    git('add', '-A', 'app-preview')
    if not git('status', '--porcelain', 'app-preview').strip():
        print('Preview already up to date (v%s).' % meta['version']); return
    git('-c', 'user.name=Claude', '-c', 'user.email=noreply@anthropic.com', 'commit', '-q', '-m',
        'Home CMS preview: app v%s (%s)' % (meta['version'], meta['zip']))
    print(git('push', '-q', 'origin', 'main', token=token).strip() or 'pushed')
    print('Preview now shows app v%s, %d files. Live in about a minute.' % (meta['version'], meta['files']))


if __name__ == '__main__':
    main()
