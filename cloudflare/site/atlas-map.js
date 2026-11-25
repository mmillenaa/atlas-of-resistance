/* Atlas: local XYZ raster map. Markers do not depend on a CDN or tile availability. */
(function(){
'use strict';
const E=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const project=([lat,lon],z)=>{const s=256*2**z,t=clamp(lat,-85.05112878,85.05112878)*Math.PI/180;return [(lon+180)/360*s,(1-Math.asinh(Math.tan(t))/Math.PI)/2*s];};
const unproject=([x,y],z)=>{const s=256*2**z;return [Math.atan(Math.sinh(Math.PI*(1-2*y/s)))*180/Math.PI,x/s*360-180];};
class Marker{
 constructor(coords,opts){this.coords=coords;this.opts=opts;this.handlers={};}
 addTo(map){map.addLayer(this);return this;}
 bindPopup(html){this.popup=html;return this;}
 on(type,fn){this.handlers[type]=fn;return this;}
 openPopup(){if(this.map){this.map.active=this;this.map.schedule();}return this;}
}
class AtlasMap{
 constructor(id){
  this.root=document.getElementById(id);this.root.replaceChildren();this.root.classList.add('atlas-raster');this.root.tabIndex=0;
  this.root.setAttribute('aria-label','Mapa interativo: use setas para mover e + ou − para zoom');
  this.center=[-15,-50];this.z=4;this.layers=new Set();this.tiles=new Map();this.source='osm';
  this.tilesPane=E('div','atlas-raster-tiles');this.markersPane=E('div','atlas-raster-markers');
  this.popup=E('div','atlas-raster-popup');this.popup.hidden=true;this.popup.setAttribute('role','region');this.popup.setAttribute('aria-label','Ficha do local histórico');
  this.warning=E('div','atlas-raster-warning');this.warning.hidden=true;
  this.controls=E('div','atlas-raster-controls');this.credit=E('div','atlas-raster-credit');
  for(const [label,title,fn] of [['+','Aproximar',()=>this.zoom(1)],['−','Afastar',()=>this.zoom(-1)],['⌂','Visão geral',()=>this.fitBounds(this.__atlasCoords||[],{maxZoom:9})]]){
   const b=E('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=fn;this.controls.append(b);
  }
  this.root.append(this.tilesPane,this.markersPane,this.popup,this.controls,this.warning,this.credit);
  this.root.addEventListener('wheel',e=>{if(e.target.closest('.atlas-raster-popup'))return;e.preventDefault();const r=this.root.getBoundingClientRect();this.zoom(e.deltaY<0?1:-1,[e.clientX-r.left,e.clientY-r.top]);},{passive:false});
  this.root.addEventListener('dblclick',e=>{if(!e.target.closest('button,a,.atlas-raster-popup'))this.zoom(1);});
  this.root.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,a,.atlas-raster-popup'))return;this.drag=[e.clientX,e.clientY,...project(this.center,this.z)];this.root.setPointerCapture(e.pointerId);});
  this.root.addEventListener('pointermove',e=>{if(!this.drag)return;const [x,y,cx,cy]=this.drag;this.center=this.safe(unproject([cx+x-e.clientX,cy+y-e.clientY],this.z));this.active=null;this.schedule();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.root.addEventListener(type,()=>{this.drag=null;});
  this.root.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.active){this.active=null;this.schedule();return;}if(e.target!==this.root)return;const d={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]}[e.key];if(d){e.preventDefault();const p=project(this.center,this.z);this.center=this.safe(unproject([p[0]+d[0],p[1]+d[1]],this.z));this.schedule();}else if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?-1:1);}});
  if(window.ResizeObserver)new ResizeObserver(()=>this.schedule()).observe(this.root);
  this.schedule();
  fetch('./api/atlas-config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{if(cfg?.carto===true){this.source='carto';for(const im of this.tiles.values())im.remove();this.tiles.clear();this.schedule();}}).catch(()=>{});
 }
 safe([lat,lon]){return [clamp(lat,-85,85),((lon+180)%360+360)%360-180];}
 setView(center,z){this.center=this.safe(center);this.z=clamp(Math.round(z),2,19);this.schedule();return this;}
 fitBounds(coords,opts={}){
  if(!coords.length)return this.setView([-15,-50],4);
  const pts=coords.map(p=>project(p,0)),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...ys),d=Math.max(...ys);
  const z=clamp(Math.floor(Math.log2(Math.min(Math.max(this.root.clientWidth-80,160)/Math.max(b-a,.00001),Math.max(this.root.clientHeight-80,160)/Math.max(d-c,.00001)))),2,opts.maxZoom||16);
  return this.setView(unproject([(a+b)/2,(c+d)/2],0),z);
 }
 zoom(delta,anchor){const z=clamp(this.z+delta,2,19);if(z===this.z)return;
  if(anchor){const p=project(this.center,this.z),dx=anchor[0]-this.root.clientWidth/2,dy=anchor[1]-this.root.clientHeight/2,q=project(unproject([p[0]+dx,p[1]+dy],this.z),z);this.center=this.safe(unproject([q[0]-dx,q[1]-dy],z));}
  this.z=z;this.active=null;this.schedule();}
 invalidateSize(){this.schedule();return this;}
 eachLayer(fn){[...this.layers].forEach(fn);}
 addLayer(l){this.layers.add(l);l.map=this;this.schedule();return this;}
 removeLayer(l){this.layers.delete(l);if(this.active===l)this.active=null;this.schedule();return this;}
 schedule(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.render();});}
 render(){
  const w=this.root.clientWidth,h=this.root.clientHeight;if(!w||!h)return;
  const z=this.z,n=2**z,world=n*256,center=project(this.center,z),left=center[0]-w/2,top=center[1]-h/2,keys=new Set();
  for(let x=Math.floor(left/256);x<=Math.floor((left+w)/256);x++)for(let y=Math.max(0,Math.floor(top/256));y<=Math.min(n-1,Math.floor((top+h)/256));y++){
   const key=z+'/'+x+'/'+y,path=z+'/'+((x%n+n)%n)+'/'+y+'.png';keys.add(key);let im=this.tiles.get(key);
   if(!im){im=E('img');im.alt='';im.draggable=false;im.width=256;im.height=256;im.dataset.state='loading';im.dataset.provider=this.source;
    const osm='https://tile.openstreetmap.org/'+path;im.onload=()=>{im.dataset.state='ok';this.tileStatus();};
    im.onerror=()=>{if(im.dataset.provider==='carto'){im.dataset.provider='osm';im.src=osm;}else{im.dataset.state='error';im.style.visibility='hidden';this.tileStatus();}};
    this.tiles.set(key,im);this.tilesPane.append(im);im.src=this.source==='carto'?'./api/atlas-tiles/'+path:osm;}
   im.style.transform='translate('+Math.round(x*256-left)+'px,'+Math.round(y*256-top)+'px)';
  }
  for(const [key,im] of this.tiles)if(!keys.has(key)){im.remove();this.tiles.delete(key);}
  const point=coords=>{const p=project(coords,z);let dx=p[0]-center[0];if(dx>world/2)dx-=world;if(dx< -world/2)dx+=world;return [dx+w/2,p[1]-top];};
  this.markersPane.replaceChildren();
  for(const m of [...this.layers].filter(l=>l instanceof Marker).sort((a,b)=>(a.opts.priority||0)-(b.opts.priority||0))){
   const [x,y]=point(m.coords);if(x< -40||x>w+40||y< -40||y>h+40)continue;
   const b=E('button','atlas-raster-marker');b.type='button';b.setAttribute('aria-label',m.opts.label||'Local histórico');
   const r=m.opts.radius||7;b.style.cssText='left:'+x+'px;top:'+y+'px;width:'+r*2+'px;height:'+r*2+'px;background:'+m.opts.fillColor+';border:'+(m.opts.weight||1.5)+'px '+(m.opts.approximate?'dashed':'solid')+' '+m.opts.color+';opacity:'+(m.opts.fillOpacity??.85);
   b.onclick=()=>{this.active=m;m.handlers.click?.();this.schedule();};this.markersPane.append(b);
  }
  if(this.active&&this.layers.has(this.active)){
   const [x,y]=point(this.active.coords);this.popup.hidden=false;
   // Avoid rebuilding the selected card during map repaints (preserve scroll position).
   if(this.popupMarker!==this.active){this.popup.innerHTML='<button type="button" class="atlas-popup-close" aria-label="Fechar ficha do local">×</button>'+this.active.popup;this.popupMarker=this.active;this.popup.scrollTop=0;}
   const pw=this.popup.offsetWidth,ph=this.popup.offsetHeight;
   this.popup.style.left=clamp(x-pw/2,8,Math.max(8,w-pw-8))+'px';
   const above=y-ph-14,below=y+14;
   this.popup.style.top=clamp(above>=8?above:below,8,Math.max(8,h-ph-24))+'px';
   this.popup.querySelector('button').onclick=()=>{this.active=null;this.schedule();};
  }else{this.popup.hidden=true;this.popupMarker=null;}
  this.tileStatus();
 }
 tileStatus(){const tiles=[...this.tiles.values()],failed=tiles.filter(t=>t.dataset.state==='error').length;
  this.warning.hidden=!failed;this.warning.textContent=failed===tiles.length?'Mapa-base indisponível; os marcadores continuam ativos.':'Parte do mapa-base está indisponível.';
  const carto=tiles.some(t=>t.dataset.provider==='carto'&&t.dataset.state==='ok');
  this.credit.innerHTML='<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>'+(carto?' · <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">© CARTO</a>':'');
 }
}
window.AtlasRaster={map:id=>new AtlasMap(id),circleMarker:(p,o)=>new Marker(p,o),CircleMarker:Marker};
})();