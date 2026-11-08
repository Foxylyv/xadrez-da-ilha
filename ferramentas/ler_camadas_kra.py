import sys, os, re
from PIL import Image
import numpy as np

def lzf_decompress(data, out_len):
    out = bytearray(); i = 0; n = len(data)
    while i < n:
        ctrl = data[i]; i += 1
        if ctrl < 32:
            l = ctrl + 1; out += data[i:i+l]; i += l
        else:
            l = ctrl >> 5
            ref = len(out) - ((ctrl & 0x1f) << 8) - 1
            if l == 7: l += data[i]; i += 1
            ref -= data[i]; i += 1
            l += 2
            for _ in range(l): out.append(out[ref]); ref += 1
    return bytes(out)

def read_layer(path, W, H, ox, oy):
    raw = open(path,'rb').read()
    pos = 0; hdr = {}
    for _ in range(5):
        e = raw.index(b'\n', pos); line = raw[pos:e].decode(); pos = e+1
        k, v = line.split(' ',1); hdr[k] = v
    ps = int(hdr['PIXELSIZE']); tw = int(hdr['TILEWIDTH']); th = int(hdr['TILEHEIGHT'])
    img = np.zeros((H, W, 4), np.uint8)
    for _ in range(int(hdr['DATA'])):
        e = raw.index(b'\n', pos); x,y,_c,sz = raw[pos:e].decode().split(','); pos = e+1
        x=int(x); y=int(y); sz=int(sz)
        blob = raw[pos:pos+sz]; pos += sz
        tlen = tw*th*ps
        data = lzf_decompress(blob[1:], tlen) if blob[0]==1 else blob[1:]
        planes = np.frombuffer(data, np.uint8).reshape(ps, th, tw)
        if ps == 4: b,g,r,a = planes; tile = np.stack([r,g,b,a],-1)
        else: gr,a = planes; tile = np.stack([gr,gr,gr,a],-1)
        X = x+ox; Y = y+oy
        x0,y0 = max(X,0),max(Y,0); x1,y1 = min(X+tw,W),min(Y+th,H)
        if x1<=x0 or y1<=y0: continue
        img[y0:y1, x0:x1] = tile[y0-Y:y1-Y, x0-X:x1-X]
    return Image.fromarray(img,'RGBA')

if __name__ == '__main__':
    d, out = sys.argv[1], sys.argv[2]
    xml = open(os.path.join(d,'maindoc.xml')).read()
    for m in re.finditer(r'<layer [^>]*/>', xml):
        t = m.group(0); a = dict(re.findall(r'(\w[\w-]*)="([^"]*)"', t))
        im = read_layer(os.path.join(d,'Sem nome','layers',a['filename']),1920,1080,int(a['x']),int(a['y']))
        im.save(os.path.join(out, a['filename']+'.png'))
        print(a['filename'], a['visible'], a['opacity'], im.getbbox())
