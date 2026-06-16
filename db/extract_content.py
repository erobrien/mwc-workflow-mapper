# -*- coding: utf-8 -*-
"""Pull human-readable string/template literals out of a minified JS bundle."""
import re, sys

CODE_HINTS = ('function', 'return ', '=>', 'undefined', 'React', 'className',
              'http://www.w3', '<svg', 'px-', 'py-', 'rounded', 'var(--',
              'fill=', 'stroke', 'viewBox', 'M0 0', 'translate', 'currentColor')

def literals(text):
    # backtick, double, single quoted runs of length >= 4
    pat = re.compile(r'`((?:[^`\\]|\\.){4,})`|"((?:[^"\\]|\\.){4,})"|\'((?:[^\'\\]|\\.){4,})\'')
    for m in pat.finditer(text):
        t = m.group(1) or m.group(2) or m.group(3)
        if not re.search(r'[ .,:;!?→]', t):      # must read like prose
            continue
        if re.match(r'^[\w$./@-]+$', t):
            continue
        if any(h in t for h in CODE_HINTS):
            continue
        yield t.replace('\\n', '\n').replace("\\'", "'").replace('\\"', '"')

def main():
    text = open(sys.argv[1], encoding='utf-8', errors='replace').read()
    seen = set()
    for t in literals(text):
        if t not in seen:
            seen.add(t)
            print(t)

if __name__ == '__main__':
    main()
