import sys, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
SKY = np.array([148,255,255],np.float32); SEA = np.array([89,211,255],np.float32)
HZ = 981  # linha do horizonte

# 1) apaga o tabuleiro desenhado (fica céu liso; a linha do horizonte está fora dele)
im[118:952, 978:1838] = SKY

# 2) céu e mar em degradê (desloca a cor proporcional à semelhança -> preserva o antialias das linhas)
def shift(mask_color, top, bot, y0, y1, reach=140):
    # peso = quanto o pixel é 'cor-alvo misturada com preto' (antialias da linha)
    a = (im @ mask_color) / (mask_color @ mask_color)
    res = np.linalg.norm(im - a[...,None]*mask_color, axis=2)
    w = np.where(res < 10, np.clip(a,0,1), 0.0)
    ys = np.clip((np.arange(H) - y0) / max(1,(y1-y0)), 0, 1)[:,None,None]
    grad = np.array(top,np.float32)*(1-ys) + np.array(bot,np.float32)*ys
    return w, grad
w, g = shift(SKY, (118,196,238), (206,243,250), 0, HZ)
skyw = (w > 0.98)
im += (g - SKY) * w[...,None] * (np.arange(H) < HZ+3)[:,None,None]
w2, g2 = shift(SEA, (120,205,236), (46,140,196), HZ, H)
seaw = (w2 > 0.98) & (np.arange(H) > HZ)[:,None]
im += (g2 - SEA) * w2[...,None] * (np.arange(H) > HZ-3)[:,None,None]

img = Image.fromarray(np.clip(im,0,255).astype(np.uint8))

# 3) sombra azulada embaixo das nuvens (componentes brancos grandes no céu)
arr = np.array(img)
white = (arr.min(axis=2) > 248)
wm = Image.fromarray((white*255).astype(np.uint8))
shade = Image.new('L', (W,H), 0); sd = np.zeros((H,W),np.float32)
seen = np.zeros((H,W),bool)
for y in range(0, 640, 6):
    for x in range(0, W, 6):
        if white[y,x] and not seen[y,x]:
            comp = wm.copy(); ImageDraw.floodfill(comp, (x,y), 128)
            c = (np.array(comp) == 128); seen |= c
            n = c.sum()
            if n < 2500: continue
            ys, xs = np.nonzero(c); y0, y1 = ys.min(), ys.max()
            t = np.clip(((np.arange(H)-y0)/(y1-y0+1) - 0.45)/0.55, 0, 1)[:,None]
            sd = np.maximum(sd, c * t)
arr = arr.astype(np.float32)
tint = np.array([196,224,244],np.float32)
arr = arr*(1-sd[...,None]*0.55) + tint*(sd[...,None]*0.55)
img = Image.fromarray(np.clip(arr,0,255).astype(np.uint8))

# 4) ondinhas e brilhos no mar (só sobre água)
random.seed(7)
ov = Image.new('RGBA', (W,H), (0,0,0,0)); d = ImageDraw.Draw(ov)
seamask = Image.fromarray((seaw*255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))
sm = np.array(seamask)
for _ in range(90):
    x = random.randint(0,W-60); y = random.randint(HZ+12, H-10)
    if sm[y, min(W-1,x+30)] == 0 or sm[y,x]==0: continue
    L = random.randint(18, 60) * (0.5 + (y-HZ)/(H-HZ))
    d.arc([x, y-6, x+L, y+6], 200, 340, fill=(255,255,255,int(90+60*(y-HZ)/(H-HZ))), width=2)
# sombra suave da ilha/baleia na água
sh = Image.new('L',(W,H),0); ImageDraw.Draw(sh).ellipse([620, HZ-6, 1060, HZ+34], fill=70)
sh = sh.filter(ImageFilter.GaussianBlur(14))
shn = np.array(sh).astype(np.float32)/255 * seaw
base = np.array(img).astype(np.float32)
base = base*(1-shn[...,None]*0.5) + np.array([20,70,120],np.float32)*shn[...,None]*0.5
img = Image.fromarray(np.clip(base,0,255).astype(np.uint8)).convert('RGBA')
img.alpha_composite(ov)

# 5) brilho de sol suave no céu do lado direito
glow = Image.new('L',(W,H),0); ImageDraw.Draw(glow).ellipse([1500,-260,2200,380], fill=150)
glow = glow.filter(ImageFilter.GaussianBlur(90))
gn = np.array(glow).astype(np.float32)/255 * skyw
b = np.array(img.convert('RGB')).astype(np.float32)
b = b*(1-gn[...,None]*0.6) + np.array([255,250,220],np.float32)*gn[...,None]*0.6
Image.fromarray(np.clip(b,0,255).astype(np.uint8)).save(out)
print('ok')
