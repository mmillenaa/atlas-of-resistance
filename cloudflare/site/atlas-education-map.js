/* Independent cartography layer; no changes to the knowledge graph or public matrices. */
(function(){
'use strict';
const $=id=>document.getElementById(id), data=window.AtlasEducationData||[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zones=['Norte','Sul / Sudeste','Leste','Oeste','Centro','Grande São Paulo','Sem sede única'];
const S='http://www.w3.org/2000/svg';
let mode='regular',overlay=false,zone='Todas',geography=null,geometryRequested=false,scale='metro',rerender,selected=null;
const valid=r=>Array.isArray(r.coords)&&r.coords.length===2&&r.coords.every(Number.isFinite);
const state=()=>({mode,regular:mode==='regular'||overlay,education:mode==='education',violations:mode==='violations',vector:mode==='education'&&!overlay});
const records=()=>data.filter(r=>zone==='Todas'||r.regiao===zone);
function details(r){
 const line=(label,value)=>value?'<p><b>'+esc(label)+':</b> '+esc(value)+'</p>':'';
 const link=(url,label)=>/^https?:\/\//i.test(url||'')?'<p class="map-source"><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a></p>':'';
 return '<h3>'+esc(r.iniciativa)+'</h3><p class="map-location-meta">'+esc([r.regiao,r.municipio,r.bairro_regiao].filter(Boolean).join(' · '))+'</p>'+line('Endereço documentado ou de referência',r.endereco)+line('Período',r.periodo_referencia)+line('Relação histórica',r.relacao_com_osm_sp)+line('Educadoras e outros sujeitos',r.educadoras_e_outros_sujeitos)+line('Atividades',r.atividade)+line('Precisão documental',r.precisao_espacial)+line('Precisão cartográfica',r.precisao_coordenada)+(r.nota_critica?'<div class="map-history">'+esc(r.nota_critica)+'</div>':'')+line('Referência',r.fonte)+link(r.url_fonte_publica,'Consultar fonte pública')+link(r.url_complementar,'Fonte complementar');
}
function show(r){selected=r.id_provisorio;$('mapSide').innerHTML=details(r);}
function groupCard(items){return items.map(r=>'<article class="edu-group-card">'+details(r)+'</article>').join('');}
function showGroup(items){if(items.length===1)show(items[0]);else{selected=null;$('mapSide').innerHTML='<h3>'+items.length+' registros próximos</h3>'+groupCard(items);}}
function resetSide(){$('mapSide').innerHTML='<h3>Leitura dos lugares</h3><p>Selecione um marcador ou um registro sem localização pontual para consultar o histórico, as pessoas relacionadas, as fontes e a precisão geográfica.</p>';selected=null;}
function sync(){const s=state();$('mapModeRegular').setAttribute('aria-pressed',String(mode==='regular'));$('mapModeViolations').setAttribute('aria-pressed',String(s.violations));$('mapModeEducation').setAttribute('aria-pressed',String(s.education));$('mapOverlayWrap').hidden=mode==='regular';$('mapOverlay').checked=overlay;$('mapOverlayText').textContent=s.education?'Sobrepor ao mapa regular':'Manter os demais locais históricos';$('mapNormativeControls').hidden=!s.violations;$('heat').disabled=!s.violations;$('mapConcept').disabled=!s.violations;$('mapEducationControls').hidden=!s.education;$('map').hidden=s.vector;$('eduMap').hidden=!s.vector;$('mapRegularLegend').hidden=s.vector;$('mapEducationLegend').hidden=!s.education;$('eduScaleControls').hidden=!s.vector;if(!s.education)$('eduUnlocatedWrap').hidden=true;}
function setMode(next){if(next===mode)return;mode=next;overlay=false;zone='Todas';scale='metro';$('heat').checked=false;$('mapConcept').value='ALL';resetSide();sync();rerender(true);}
function setup(fn){rerender=fn;$('mapModeRegular').onclick=()=>setMode('regular');$('mapModeViolations').onclick=()=>setMode('violations');$('mapModeEducation').onclick=()=>setMode('education');$('mapOverlay').onchange=e=>{overlay=e.target.checked;resetSide();sync();rerender(true);};$('eduZone').onchange=e=>{zone=e.target.value;scale='metro';resetSide();sync();rerender(true);};$('eduScaleMetro').onclick=()=>{scale='metro';renderVector();};$('eduScaleState').onclick=()=>{scale='state';renderVector();};sync();}
function renderControls(){
 const el=$('eduZone');const options=['Todas',...zones];if(!el.options.length)options.forEach(z=>{const o=document.createElement('option');o.value=z;el.append(o);});for(const o of el.options)o.textContent=o.value+' ('+data.filter(r=>o.value==='Todas'||r.regiao===o.value).length+')';el.value=zone;
 const missing=records().filter(r=>!valid(r));const host=$('eduUnlocated');host.replaceChildren();$('eduUnlocatedWrap').hidden=!missing.length;
 for(const r of missing){const b=document.createElement('button');b.type='button';b.className='edu-record';b.textContent=r.iniciativa;b.onclick=()=>show(r);host.append(b);}
 const mapped=records().filter(valid).length;$('eduCount').textContent=mapped+' registros com referência espacial · '+missing.length+' sem ponto';
}
function svgEl(tag,attrs={},txt){const e=document.createElementNS(S,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(txt!=null)e.textContent=txt;return e;}
function rings(g){if(!g)return[];if(g.type==='FeatureCollection')return g.features.flatMap(rings);if(g.type==='Feature')return rings(g.geometry);if(g.type==='Polygon')return g.coordinates;if(g.type==='MultiPolygon')return g.coordinates.flat();return[];}
function project(bounds,w,h,pad=26){const [minLat,minLon,maxLat,maxLon]=bounds,cos=Math.cos((minLat+maxLat)/2*Math.PI/180),dx=(maxLon-minLon)*cos,dy=maxLat-minLat,k=Math.min((w-2*pad)/dx,(h-2*pad)/dy),x0=(w-dx*k)/2,y0=(h-dy*k)/2;return ([lat,lon])=>[x0+(lon-minLon)*cos*k,y0+(maxLat-lat)*k];}
function pathFor(g,p){return rings(g).map(r=>r.map(([lon,lat],i)=>{const [x,y]=p([lat,lon]);return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ')+' Z').join(' ');}
function loadGeometry(){if(geometryRequested)return;geometryRequested=true;fetch('./data/atlas-education-boundaries.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(g=>{geography=g;if(state().vector)renderVector();}).catch(()=>{if(state().vector)renderVector();});}
function renderVector(){
 if(!state().vector)return;loadGeometry();renderControls();const host=$('eduMapCanvas');host.replaceChildren();const items=records().filter(valid);const w=760,h=480;let bounds=scale==='state'?[-25.4,-53.3,-19.6,-44.0]:[-23.80,-46.87,-23.37,-46.36];
 if(scale==='metro'&&zone!=='Todas'&&items.length){let la=items.map(r=>r.coords[0]),lo=items.map(r=>r.coords[1]);bounds=[Math.min(...la)-.045,Math.min(...lo)-.065,Math.max(...la)+.045,Math.max(...lo)+.065];}
 const p=project(bounds,w,h);const svg=svgEl('svg',{viewBox:`0 0 ${w} ${h}`,role:'group','aria-label':'Cartografia simplificada das iniciativas educacionais','class':'edu-svg'});const clip=svgEl('clipPath',{id:'eduClip'});clip.append(svgEl('rect',{x:0,y:0,width:w,height:h}));const defs=svgEl('defs');defs.append(clip);svg.append(defs);const base=svgEl('g',{'clip-path':'url(#eduClip)'});svg.append(base);
 if(scale==='state'&&geography?.state)base.append(svgEl('path',{d:pathFor(geography.state,p),class:'edu-boundary','fill-rule':'evenodd'}));
 if(scale==='metro'&&geography?.municipalities)for(const g of Object.values(geography.municipalities))base.append(svgEl('path',{d:pathFor(g,p),class:'edu-boundary edu-municipality','fill-rule':'evenodd'}));
 if(scale==='state'&&items.length){const [x,y]=p([-23.55,-46.63]);base.append(svgEl('text',{x:x-12,y:y-20,class:'edu-geolabel','text-anchor':'end'},'Grande São Paulo'));}
 if(scale==='metro'&&zone==='Todas'){
 const labels=[['NORTE',[-23.43,-46.64]],['OESTE',[-23.51,-46.79]],['LESTE',[-23.48,-46.43]],['CENTRO',[-23.52,-46.63]],['SUL / SUDESTE',[-23.75,-46.65]],['Osasco',[-23.49,-46.81]],['Guarulhos',[-23.43,-46.51]],['Santo André',[-23.70,-46.50]]];
 for(const [n,c] of labels){let [x,y]=p(c);base.append(svgEl('text',{x,y,class:'edu-geolabel','text-anchor':'middle'},n));}}
 // Visually aggregate coincident or very close markers; do not move their geographic anchors.
 const clusters=[];for(const r of items){const [x,y]=p(r.coords);const near=clusters.find(c=>Math.hypot(c.x-x,c.y-y)<18);if(near)near.items.push(r);else clusters.push({x,y,items:[r]});}
 for(const c of clusters){const n=c.items.length,g=svgEl('g',{class:'edu-marker',tabindex:0,role:'button','aria-label':c.items.map(r=>r.iniciativa).join('; ')});const exact=c.items.every(r=>!r.aproximado);g.append(svgEl('circle',{cx:c.x,cy:c.y,r:n>1?11:6.5,class:exact?'edu-point':'edu-point edu-approx'}));if(n>1)g.append(svgEl('text',{x:c.x,y:c.y+3.8,class:'edu-point-count','text-anchor':'middle'},n));g.append(svgEl('title',{},c.items.map(r=>r.iniciativa).join('\n')));g.onclick=()=>{if(scale==='state'){scale='metro';renderVector();}showGroup(c.items);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.onclick();}};base.append(g);}
 // North arrow: orientation only, no administrative zone boundaries are implied.
 svg.append(svgEl('path',{d:'M 726 49 L 733 25 L 740 49 L 733 43 Z',fill:'#9D2235'}));svg.append(svgEl('text',{x:733,y:19,class:'edu-north','text-anchor':'middle'},'N'));host.append(svg);
 $('eduScaleMetro').setAttribute('aria-pressed',String(scale==='metro'));$('eduScaleState').setAttribute('aria-pressed',String(scale==='state'));
 $('eduBaseNote').textContent=(scale==='state'?!geography?.state:!geography?.municipalities?.['3550308'])?'Contorno cartográfico ainda indisponível; pontos apresentados em projeção esquemática, sem limite territorial inventado.':'Base: malhas simplificadas do IBGE, limites contemporâneos. As zonas são referências de leitura, não divisões históricas oficiais.';
 $('mapStatus').textContent=items.length+' registros educacionais com referência espacial · '+(records().length-items.length)+' sem ponto. Marcadores vazados = referência aproximada; não equivalem ao endereço exato.';
}
function rasterGroups(map,L){const items=records().filter(valid),groups=new Map();for(const r of items){const key=r.coords.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}for(const rs of groups.values()){const r=rs[0],html=rs.length===1?details(r):groupCard(rs);L.circleMarker(r.coords,{radius:rs.length>1?10:7,label:rs.map(x=>x.iniciativa).join('; '),color:'#A51A12',fillColor:rs.every(x=>!x.aproximado)?'#FF2B1F':'#fff',weight:2,fillOpacity:1,priority:5,approximate:rs.some(x=>x.aproximado)}).addTo(map).bindPopup(html).on('click',()=>showGroup(rs));}return items;}
window.AtlasEducation={setup,state,records,renderControls,renderVector,rasterGroups};
})();
