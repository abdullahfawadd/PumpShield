import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
common={'success':'#1F6247','success-surface':'#E7F3EB','warning':'#80530B','warning-surface':'#FFF3D6','error':'#9E302F','error-surface':'#FCEBE8','info':'#24598A','info-surface':'#EAF2FC'}
palettes={
'petroleum':{'name':'01 · Petroleum Ledger','philosophy':'A calm instrument panel: warm paper, petroleum ink, clear exceptions. Compact work-first navigation.', 'tokens':{'background':'#F5F3EE','surface':'#FFFFFF','surface-raised':'#FFFFFF','text':'#202724','text-secondary':'#58645F','primary':'#174C45','on-primary':'#FFFFFF','secondary':'#E9EDE7','on-secondary':'#34473E','border':'#CAD1CB','control-border':'#7A8580','focus':'#2463AA','chart-1':'#174C45','chart-2':'#24598A','chart-3':'#80530B',**common}},
'graphite':{'name':'02 · Graphite Dispatch','philosophy':'A focused control room: persistent exception rail, dark map and restrained mint controls. Best for indoor monitoring.', 'tokens':{'background':'#151A1B','surface':'#202728','surface-raised':'#2A3432','text':'#EFF4EF','text-secondary':'#B0BDB7','primary':'#A5D6BA','on-primary':'#142A20','secondary':'#35463D','on-secondary':'#E6EEE7','border':'#4A5852','control-border':'#7D8D85','focus':'#AFC9FF','chart-1':'#A5D6BA','chart-2':'#9EC3F1','chart-3':'#E7C47D','success':'#A5D6BA','success-surface':'#203D30','warning':'#F1D089','warning-surface':'#443820','error':'#FFB4AA','error-surface':'#4B2D2C','info':'#B3D1FA','info-surface':'#293C53'}},
'ivory':{'name':'03 · Forecourt Journal','philosophy':'A refined operational journal: ivory, forest and copper; ruled tables, clear section numbering and generous reading rhythm.', 'tokens':{'background':'#FAF7F0','surface':'#FFFDFC','surface-raised':'#FFFFFF','text':'#262621','text-secondary':'#66614F','primary':'#3C4936','on-primary':'#FFFFFF','secondary':'#EEE4D8','on-secondary':'#75523E','border':'#D4CFC0','control-border':'#8A816D','focus':'#5B509C','chart-1':'#3C4936','chart-2':'#75523E','chart-3':'#5B509C',**common}}}
def lum(h):
    a=[int(h[i:i+2],16)/255 for i in (1,3,5)]; a=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in a]
    return sum(x*y for x,y in zip(a,[.2126,.7152,.0722]))
def ratio(a,b):
    x,y=sorted([lum(a),lum(b)]);return round((y+.05)/(x+.05),2)
pairs=[('text','background',4.5),('text','surface',4.5),('text-secondary','surface',4.5),('text-secondary','background',4.5),('on-primary','primary',4.5),('on-secondary','secondary',4.5),('control-border','surface',3),('focus','surface',3),('focus','background',3)]+[(x,x+'-surface',4.5)for x in ['success','warning','error','info']]+[(x,'surface',3)for x in ['chart-1','chart-2','chart-3']]
contrasts=[]
for key,p in palettes.items():
    for fg,bg,threshold in pairs:
        r=ratio(p['tokens'][fg],p['tokens'][bg]);contrasts.append({'direction':key,'foreground':fg,'background':bg,'fg':p['tokens'][fg],'bg':p['tokens'][bg],'ratio':r,'minimum':threshold,'pass':r>=threshold})
(root/'evidence/design-tokens.json').write_text(json.dumps(palettes,indent=2))
(root/'evidence/contrast-calculations.json').write_text(json.dumps(contrasts,indent=2))
print(json.dumps({'pairs':len(contrasts),'failures':[x for x in contrasts if not x['pass']]}))
