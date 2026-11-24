/* Atlas da Resistência: navegador estático, sem transmissão de matrizes privadas */
'use strict';
const $ = id => document.getElementById(id);
const HTML = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = x => x == null || x === 'NA' ? '' : String(x).trim();
const first = (row, keys) => keys.map(k => text(row[k])).find(Boolean) || '';
const schema = {
  Persons:['PersonID',['Name'],'Pessoa'],
  Institutions:['InstitutionID',['Name_ORIG','Name_ENG'],'Instituição'],
  Movements:['MovementID',['Name_ORIG','Name_EN'],'Movimento'],
  Events:['EventID',['EventType'],'Evento'],
  Concepts:['ConceptID',['Label_PT','Label_ORIG','ConceptName_ORIG','Label_EN'],'Conceito'],
  Documents:['DocumentID',['Title_ORIG','DisplayTitle_ORIG','DisplayTitle_EN','Repository'],'Documento'],
  Locations:['PlaceID',['PlaceName_ORIG','PlaceName_EN','PlaceName'],'Local']
};
const relations = [
 ['PersonMovements','PersonID','MovementID','Role'],
 ['PersonInstitutions','PersonID','InstitutionID','Role'],
 ['EventPersons','PersonID','EventID','Role'],
 ['EventConcepts','EventID','ConceptID','RelationType'],
 ['DocumentPersons','DocumentID','PersonID','RelationshipType'],
 ['DocumentEvents','DocumentID','EventID','RelationshipType'],
 ['DocumentLocations','DocumentID','PlaceID','RelationshipType'],
 ['InstitutionRelations','SourceInstitutionID','TargetInstitutionID','RelationshipType'],
 ['MovementRelations','SourceMovementID','TargetMovementID','RelationshipType'],
 ['MovementInstitutionRelations','MovementID','InstitutionID','RelationshipType']
];
const color={Pessoa:'#9D2235',Movimento:'#e2c68e',Instituição:'#d5d5d5',Evento:'#93adbb',Conceito:'#baa9ca',Documento:'#e3dfda',Local:'#a2bba5'};
const hubs=['M001','I008','I108','I107','M018','I116','I119','I005'];
let db={}, nodeById=new Map(), edgeRows=[], visible=new Set(), selected='', net=null, leafletMap=null, manifest={};
let imageCache=new Map();
let historicosLocais={};
let primeiroAjusteMapa=false;
// Destaques experimentais de iniciativas de educação de trabalhadores.
// A lista é explícita e pode ser revisada após a qualificação.
const focosEducacionais = new Set(['I108','I119','I126','I137','I139']);

let miniBiografias={};
const rows=key=>Array.isArray(db[key])?db[key]:[];

function parseCSV(csv){
  const all=[];let row=[],val='',quoted=false;
  csv=csv.replace(/^\uFEFF/,'');
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(quoted){if(c==='"'&&csv[i+1]==='"'){val+='"';i++;}else if(c==='"')quoted=false;else val+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(val);val='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(val);if(row.some(x=>x.trim()))all.push(row);row=[];val='';}
    else val+=c;
  }
  if(val||row.length){row.push(val);if(row.some(x=>x.trim()))all.push(row);}
  if(!all.length)return [];
  const header=all.shift().map(x=>x.trim());
  return all.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]||''])));
}

async function portrait(n){
  const id=n.id;
  if(imageCache.has(id))return imageCache.get(id);
  const local=manifest[id];
  if(local){
    const url='./assets/people/'+encodeURIComponent(local);
    try{const response=await fetch(url,{method:'HEAD'});if(response.ok){imageCache.set(id,url);return url;}}catch(e){}
  }
  const fallback=text(n.raw.ImageURL);
  const result=/^https?:\/\//i.test(fallback)?fallback:'';
  imageCache.set(id,result);return result;
}

const rolePT = Object.freeze({
 active_member:'Integrante ativo', associated_with:'Vinculado a', coordinator_of:'Coordenação de',
 founding_member:'Integrante fundador', integral_participant:'Integrante constitutivo do coletivo',
 leader_of:'Liderança de', member_of:'Integrante de', organizer:'Organização',
 participant:'Participante', president_of:'Presidência de', representative_of:'Representante de',
 subcommander_of:'Subcomandante de', advisor:'Assessoria a', athlete:'Atleta em',
 director_of:'Direção de', educator:'Educação em', elected_member:'Representante eleito de',
 employee:'Trabalhador em', federal_deputy:'Deputado federal',
 founder_and_president:'Fundador e presidente de', founder_of:'Fundador de',
 lawyer:'Advocacia em', lay_representative:'Representação leiga em',
 opposition_candidate:'Candidato de oposição em', parish_priest:'Pároco de',
 pastoral_agent:'Agente pastoral de', priest:'Sacerdote em', professor:'Professor em',
 researcher:'Pesquisa em', resident:'Morador de', secretary_of:'Secretaria de',
 student:'Estudante em', teacher:'Docência em', teacher_trainer:'Formação docente em',
 union_delegate:'Delegado sindical de', volunteer:'Voluntário de',
 beneficiary_of:'Beneficiário de', candidate_in:'Candidato em', lawyer_at:'Advogado em',
 organizer_of:'Organizador de', participant_in:'Participante em', victim_of:'Vítima de',
 characterized_as:'Caracterizado como', claims:'Reivindica', exercises:'Exerce',
 violates:'Viola', cites:'Cita', is_about:'Trata de', mentions:'Menciona',
 collaborated_with:'Colaborou com', emerged_from_pedagogical_network_of:'Surgiu da rede pedagógica de',
 operated_at:'Atuou em', organizational_unit_of:'Unidade de',
 pedagogical_continuation_of:'Continuidade pedagógica de',
 supported_educational_work_of:'Apoiou a formação de',
 territorial_body_of:'Instância territorial de', articulates_with:'Articula-se com',
 contributed_to_formation_of:'Contribuiu para formar',
 organizational_reconfiguration_into:'Reorganizou-se em',
 articulated_with:'Articulou-se com', contested_leadership_of:'Disputou a direção de',
 contributed_to_creation_of:'Contribuiu para criar', documented_by:'Documentado por',
 political_current_within:'Corrente política em', related_to:'Relacionado a',
 co_present_at:'Participaram do mesmo evento', co_affiliation_inferred:'Compartilham participação em organizações'
});

const additionalRoleLabels = {"place_of_surveillance": "Local de vigilância", "adjudicating_court": "Órgão julgador", "place_of_interview": "Local de entrevista", "supporting_agency": "Órgão de apoio", "place_of_arbitrary_detention": "Local de detenção arbitrária", "participant_agency": "Órgão participante", "place_of_violation": "Local da violação", "target_agency": "Órgão visado", "depicts": "Retrata", "place_of_intimidation": "Local de intimidação", "place_of_persecution": "Local de perseguição", "place_of_torture": "Local de tortura", "perpetrator_agency": "Órgão responsável pela violação", "organizer_agency": "Órgão organizador", "place_of_falsification_of_cause_of_death_or_evidence_tampering": "Local de falsificação da causa da morte ou adulteração de provas", "place_of_incarceration": "Local de encarceramento", "place_of_concealment_of_a_body": "Local de ocultação de cadáver"};
const roleLabel = x => rolePT[text(x)] || additionalRoleLabels[text(x)] || text(x).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
const legalPT={"right":"Direito","violation":"Violação","crime":"Crime","Labor Law":"Direito do Trabalho","Positive Penal Law":"Direito Penal positivo","Human Rights":"Direitos humanos","Analytical Category":"Categoria analítica","Civil Rights / Constitutional Law":"Direitos civis / Direito Constitucional","International Law":"Direito Internacional","Human Rights / Transitional Justice":"Direitos humanos / Justiça de transição","Human Rights / Constitutional Law":"Direitos humanos / Direito Constitucional","Analytical Category / Int. Criminal Law":"Categoria analítica / Direito Penal Internacional","Human Rights / Int. Law":"Direitos humanos / Direito Internacional","Codified as Crime":"Tipificado como crime"," (Analytical)":"Categoria analítica","Formally recognized / Selective suppression":"Formalmente reconhecido / supressão seletiva","Suspended / Regulated by State":"Suspenso / regulamentado pelo Estado","Treated as Subversion / Criminalized":"Tratado como subversão / criminalizado","Uncodified Crime / Officially denied":"Não tipificado / oficialmente negado","Legalized Exception (Habeas Corpus suspended)":"Exceção legalizada (habeas corpus suspenso)","Partially Maintained / Politically Controlled":"Parcialmente mantido / controlado politicamente","Ignored / ":"Ignorado","Suspended / State Intervention":"Suspenso / intervenção estatal","Unregulated / Permitted":"Sem regulamentação / permitido","Facilitated by State":"Facilitado pelo Estado","Uncodified / Ignored":"Não tipificado / ignorado","Denied / Eradicated":"Negado / reprimido","Formally recognised / Heavily censored":"Formalmente reconhecido / fortemente censurado","Suspended for political targets":"Suspenso para alvos políticos","Restricted by decree":"Restringido por decreto","Framed as National Security defence":"Enquadrado como defesa da segurança nacional","Falsified as legitimate defence":"Apresentado falsamente como legítima defesa","Violated by State Policy (executions, disappearances)":"Violado por política estatal (execuções, desaparecimentos)","Repression of political and civil groups":"Repressão de grupos políticos e civis","Violent repression / Military intervention":"Repressão violenta / intervenção militar","Selective enforcement / Falsified as suicide":"Aplicação seletiva / falsificação como suicídio","Ignored for political crimes / Impunity":"Ignorado em crimes políticos / impunidade","Institutional Policy":"Política institucional","Institutional Practice / Systemic tool":"Prática institucional / instrumento sistêmico","Institutional Practice / Mass detentions":"Prática institucional / detenções em massa","State intervention / Peleguismo":"Intervenção estatal / peleguismo","Incompatible with economic model":"Incompatível com o modelo econômico","Intervention in unions / Cassation of leaders":"Intervenção nos sindicatos / cassação de dirigentes","Institutional Practice (SNI / Listas Sujas)":"Prática institucional (SNI / listas sujas)","Institutional Practice / State-Corporate Complicity":"Prática institucional / conivência entre Estado e empresas","Corporate-State complicity / Mass dismissals":"Conivência entre empresas e Estado / demissões em massa","Institutional Practice / Mass graves":"Prática institucional / valas comuns","Systemic institutional cover-up":"Encobrimento institucional sistêmico","Systematic elimination / State terrorism":"Eliminação sistemática / terrorismo de Estado","State secrecy / Censorship":"Sigilo estatal / censura","Prior censorship / Banning of books and arts":"Censura prévia / proibição de livros e manifestações artísticas","Systemic surveillance / Wiretapping":"Vigilância sistêmica / interceptações telefônicas","Exile, banishment, and passport confiscation":"Exílio, banimento e apreensão de passaportes","Purges, cassations, and institutional targeting":"Expurgos, cassações e perseguição institucional","Institutional practice / Death squads":"Prática institucional / esquadrões da morte","Constitution of 1967/1969":"Constituição de 1967/1969","Penal Code (1940)":"Código Penal (1940)","Law 4.898/1965":"Lei 4.898/1965","Law 4.330/1964 / LSN":"Lei 4.330/1964 / LSN","CLT (1943)":"CLT (1943)","None (State denied practice)":"Nenhuma (prática negada pelo Estado)","State repression apparatus":"Aparato estatal de repressão","Law 9.029/1995":"Lei 9.029/1995","Law 13.869/2019":"Lei 13.869/2019","Transitional Justice framework":"Marco da justiça de transição","Law 9.455/1997":"Lei 9.455/1997","Penal Code (1940) Art. 211":"Código Penal (1940), art. 211","Penal Code (1940) Arts. 299 and 347":"Código Penal (1940), arts. 299 e 347","Inter-American Convention on Forced Disappearance":"Convenção Interamericana sobre o Desaparecimento Forçado de Pessoas","Inter-American Court Jurisprudence / LAI":"Jurisprudência da Corte Interamericana / Lei de Acesso à Informação","Rome Statute / Lei de Anistia (1979)":"Estatuto de Roma / Lei de Anistia (1979)","UN Principles on Extra-legal Executions / Rome Statute":"Princípios da ONU sobre execuções extralegais / Estatuto de Roma"," (Emergent post-dictatorship)":"(Categoria emergente após a ditadura)"," (Modern ILO framework)":"(Marco contemporâneo da OIT)"," (Prosecuted as kidnapping/homicide)":"(Processado como sequestro/homicídio)"," (State denied practice)":"(Prática negada pelo Estado)","AI-1 to AI-5 (Cassation of rights) / LSN":"AI-1 a AI-5 (cassação de direitos) / LSN","AI-5 (1968) / Banishment Penalty (Decree-Law 898/1969 - LSN)":"AI-5 (1968) / pena de banimento (Decreto-Lei 898/1969 — LSN)","AI-5 (1968) / Creation of SNI (Law 4.341/1964)":"AI-5 (1968) / criação do SNI (Lei 4.341/1964)","AI-5 (1968) / LSN":"AI-5 (1968) / Lei de Segurança Nacional","CLT (corporatist base) / LSN":"CLT (estrutura corporativista) / LSN","Constitution of 1967 / Press Law (Law 5.250/1967)":"Constituição de 1967 / Lei de Imprensa (Lei 5.250/1967)","Corporate practices backed by DOPS":"Práticas empresariais respaldadas pelo DOPS","Creation of FGTS (Law 5.107/1966)":"Criação do FGTS (Lei 5.107/1966)","Information exchange network":"Rede de intercâmbio de informações","Art. 5, CF/88":"Art. 5º, CF/88","Art. 5, CF/88; Law 13.869":"Art. 5º, CF/88; Lei 13.869","Art. 5, IV and IX, CF/88":"Art. 5º, IV e IX, CF/88","Art. 5, X and XII, CF/88 / LGPD":"Art. 5º, X e XII, CF/88 / LGPD","Art. 5, XV, CF/88":"Art. 5º, XV, CF/88","Art. 6, CF/88; ILO Conventions":"Art. 6º, CF/88; Convenções da OIT","Art. 7, CF/88":"Art. 7º, CF/88","Art. 7, I, CF/88; CLT":"Art. 7º, I, CF/88; CLT","Art. 8, CF/88":"Art. 8º, CF/88","Art. 9, CF/88":"Art. 9º, CF/88"};
const legalLabel=x=>legalPT[text(x)]||text(x).replace(/\bConstitution of\b/g,'Constituição de').replace(/\bPenal Code\b/g,'Código Penal').replace(/\bLaw\b/g,'Lei').replace(/\bCreation of\b/g,'Criação de').replace(/\bPress Law\b/g,'Lei de Imprensa').replace(/\bILO Conventions\b/g,'Convenções da OIT').replace(/\bState\b/g,'Estado');
const roleStatus = s => s==='inferred' ? 'inferência visual, não comprova vínculo pessoal' : s==='documented' ? 'documentada' : s==='researcher_reported' ? 'declaração da pesquisadora' : 'em revisão';
const eventLabels = {
 assassination:'Assassinato',strike:'Greve',torture:'Tortura',persecution:'Perseguição',
 dismissal:'Demissão',intimidation:'Intimidação',incarceration:'Prisão',surveillance:'Vigilância',
 protest:'Manifestação',campaign:'Campanha',congress:'Congresso',censorship:'Censura',
 exile:'Exílio','arbitrary detention':'Detenção arbitrária','summary execution':'Execução sumária'
};
const eventLabel = x => eventLabels[text(x)]||text(x).replace(/_/g,' ');
function canDisplayEdge(e){ return $('role').value==='' || e.relation===$('role').value; }

// ATLAS_SOCIAL_PROJECTION_V1
// Acontecimentos, documentos, locais e categorias juridicas continuam na base
// sem criar arestas que posicionem pessoas na rede de organizacoes.
const TIPOS_SOCIAIS = new Set(['Pessoa','Instituição','Movimento']);
function arestaSocial(e){
 const a=nodeById.get(e.from),b=nodeById.get(e.to);
 if(!a||!b||!TIPOS_SOCIAIS.has(a.kind)||!TIPOS_SOCIAIS.has(b.kind))return false;
 // Relações sociais somente entre pessoa-organização e organização-organização.
 if(a.kind==='Pessoa' && b.kind==='Pessoa')return false;
 return true;
}
function arestasSociais(){return edgeRows.filter(arestaSocial);}

async function normalize(){
  nodeById=new Map();edgeRows=[];imageCache=new Map();
  for(const [table,[key,labels,kind]] of Object.entries(schema)){
    for(const raw of rows(table)){
      const id=text(raw[key]);if(!id)continue;
      nodeById.set(id,{id,label:first(raw,labels)||id,kind,raw,photo:''});
    }
  }
  for(const [table,fromKey,toKey,relationKey] of relations){
    for(const raw of rows(table)){
      const from=text(raw[fromKey]),to=text(raw[toKey]);
      if(!nodeById.has(from)||!nodeById.has(to)||from===to)continue;
      edgeRows.push({from,to,relation:text(raw[relationKey])||'related_to',evidence:first(raw,['EvidenceText_ORIG','EvidenceText_EN']),status:text(raw.ReviewStatus)||'documented'});
    }
  }
  await Promise.all([...nodeById.values()].filter(n=>n.kind==='Pessoa').map(async n=>{n.photo=await portrait(n);}));
  updateSelectors();updateCounts();resetGraph();updateLaw();updateMap();
}

function updateSelectors(){
 const focus=$('focus'),role=$('role'),previous=focus.value;
 const sorted=[...nodeById.values()].filter(n=>TIPOS_SOCIAIS.has(n.kind)).sort((a,b)=>a.label.localeCompare(b.label,'pt'));
 focus.innerHTML='<option value="">Todas as pessoas</option>'+sorted.map(n=>'<option value="'+HTML(n.id)+'">'+HTML(n.label)+' ('+n.id+')</option>').join('');
 if(nodeById.has(previous)) focus.value=previous;
 const current=role.value;
 role.innerHTML='<option value="">Todos os vínculos</option>'+
   [...new Set(arestasSociais().map(e=>e.relation))].sort((a,b)=>roleLabel(a).localeCompare(roleLabel(b),'pt')).map(raw=>'<option value="'+HTML(raw)+'">'+HTML(roleLabel(raw))+'</option>').join('');
 if([...role.options].some(o=>o.value===current))role.value=current;
}

function neighbors(id){
  const result=[];for(const e of arestasSociais()){if(e.from===id)result.push(e.to);else if(e.to===id)result.push(e.from);}
  return [...new Set(result)].sort();
}
function resetGraph(){
 const mode=document.querySelector('input[name="graphMode"]:checked')?.value||'overview';
 const focus=$('focus').value;
 visible=new Set();
 if(mode==='overview'){
   // Todas as pessoas e TODAS as instituições e movimentos aos quais elas se vinculam.
   for(const n of nodeById.values())if(n.kind==='Pessoa')visible.add(n.id);
   for(const e of edgeRows){
     const a=nodeById.get(e.from),b=nodeById.get(e.to);
     if(a?.kind==='Pessoa'&&['Instituição','Movimento'].includes(b?.kind))visible.add(e.to);
     if(b?.kind==='Pessoa'&&['Instituição','Movimento'].includes(a?.kind))visible.add(e.from);
   }
   // As iniciativas educacionais da pesquisa aparecem mesmo sem vínculo
   // individual imediato, sem inventar nenhuma aresta documental.
   for(const id of focosEducacionais)if(nodeById.has(id))visible.add(id);
   // Ligações diretas entre organizações já cadastradas; sem criar nós ausentes.
 } else if(focus&&nodeById.has(focus)) {
   visible.add(focus);neighbors(focus).forEach(x=>visible.add(x));
 }
 if(!visible.size){for(const id of hubs)if(nodeById.has(id))visible.add(id);}
 selected='';$('detail').hidden=true;drawGraph();
}

function expand(id,cap=24){if(!nodeById.has(id))return;neighbors(id).filter(x=>!visible.has(x)).slice(0,cap).forEach(x=>visible.add(x));drawGraph();}

// Projeção analítica visual; nunca altera as relações documentais.
// Dois vínculos compartilhados em organizações específicas NÃO provam contato pessoal.
function coAffiliationEdges(){
 const byPerson=new Map(),members=new Map(),orgTypes=new Set(['Instituição','Movimento']);
 for(const e of edgeRows){
   const from=nodeById.get(e.from),to=nodeById.get(e.to);if(!from||!to)continue;
   const p=from.kind==='Pessoa'&&orgTypes.has(to.kind)?from.id:to.kind==='Pessoa'&&orgTypes.has(from.kind)?to.id:null;
   if(!p)continue;
   const org=p===from.id?to.id:from.id;
   if(!byPerson.has(p))byPerson.set(p,new Set());byPerson.get(p).add(org);
   if(!members.has(org))members.set(org,new Set());members.get(org).add(p);
 }
 const people=[...byPerson.keys()].sort(),inferred=[];
 for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++){
   const a=people[i],b=people[j];
   const shared=[...byPerson.get(a)].filter(org=>byPerson.get(b).has(org)&&org!=='M001'&&members.get(org).size<=22);
   if(shared.length<2)continue;
   inferred.push({from:a,to:b,relation:'co_affiliation_inferred',status:'inferred',
     evidence:'Aparecem em '+shared.length+' organizações cadastradas: '+shared.map(id=>nodeById.get(id)?.label||id).join(' · ')+'; não implica contato ou colaboração direta.'});
 }
 return inferred;
}

function graphNode(n){
 const isPerson=n.kind==='Pessoa';
 const label=(isPerson || n.id===selected)?n.label:'';
 return {id:n.id,label,group:n.kind,educational:focosEducacionais.has(n.id),
  shape:n.photo?'circularImage':n.kind==='Movimento'?'dot':'dot',
  image:n.photo||undefined,size:isPerson?34:n.id==='M001'?56:focosEducacionais.has(n.id)?28:16,
  borderWidth:2,title:'<b>'+HTML(n.label)+'</b>',
  color:{background:color[n.kind]||'#ddd',border:'#777',highlight:{border:'#9D2235'}},fullLabel:n.label};
}
function drawGraph(){
 const el=$('network');if(!window.vis&&!window.d3){el.textContent='Não foi possível carregar a biblioteca visual do grafo.';return;}
 const visibleEdges=arestasSociais().filter(e=>visible.has(e.from)&&visible.has(e.to)&&canDisplayEdge(e));
  // Coparticipação permanece consultável, sem gerar ligação pessoal automática.
 const groups=new Map();
 for(const e of visibleEdges){const key=[e.from,e.to].sort().join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 const graphEdges=[...groups.values()].map((g,i)=>({id:'e'+i,from:g[0].from,to:g[0].to,
  title:g.map(e=>'<b>'+HTML(roleLabel(e.relation))+'</b> — '+roleStatus(e.status)+(e.evidence?'<br>'+HTML(e.evidence.slice(0,340)):'')).join('<hr>'),
  dashes:g.some(e=>e.status==='inferred'),
  // Não desenhar rótulos sobre linhas; a proposta de pesquisa é diferenciada no tooltip.
  color:{color:'#b7b7b7',highlight:'#9D2235',hover:'#9D2235'},width:1.1}));
 const graphNodes=[...visible].map(id=>nodeById.get(id)).filter(Boolean).map(graphNode);
 if(window.d3 && window.drawAtlasD3Graph){
  if(net && typeof net.destroy==='function')net.destroy();
  net=window.drawAtlasD3Graph(graphNodes,graphEdges,(id,kind)=>{
   if(!id){
     selected='';
     $('detail').hidden=true;
     if(net?.clearFocus)net.clearFocus();
     return;
   }
   selected=id;
   showDetail(id);
   // Não substituir a prévia de todas as pessoas por uma visão radial.
   // Apenas revelar vizinhos novos, mantendo os existentes no contexto.
   if(net && typeof net.focus==='function')net.focus(id,{lock:true});
  });
  if(selected && net?.focus)net.focus(selected,{lock:true});
  const persons=[...visible].filter(id=>nodeById.get(id)?.kind==='Pessoa').length;
  $('graphStatus').textContent=persons+' pessoas · '+graphNodes.length+' nós · '+graphEdges.length+' conexões visíveis · '+arestasSociais().length+' vínculos sociais ou organizacionais cadastrados.';
  return;
 }
 if(net){net.destroy();net=null;}
 net=new vis.Network(el,{nodes:graphNodes,edges:graphEdges},{
  layout:{randomSeed:42,improvedLayout:false},
  interaction:{hover:true,navigationButtons:false,zoomView:true,dragView:true},
  physics:{enabled:true,solver:'forceAtlas2Based',forceAtlas2Based:{gravitationalConstant:-75,centralGravity:.012,springLength:145,springConstant:.065,damping:.65,avoidOverlap:.5},
    stabilization:{enabled:true,iterations:240,fit:true}},
  nodes:{font:{face:'Roboto',size:10,color:'#444',strokeWidth:2,strokeColor:'#fff'}},
  edges:{smooth:{enabled:true,type:'dynamic'},width:1.1},
  configure:false
 });
 net.on('click',p=>{if(p.nodes.length){selected=p.nodes[0];showDetail(selected);if(net&&net.focus)net.focus(selected,{lock:true});}});
 const persons=[...visible].filter(id=>nodeById.get(id)?.kind==='Pessoa').length;
 $('graphStatus').textContent=persons+' pessoas · '+graphNodes.length+' nós · '+graphEdges.length+' conexões visíveis · '+edgeRows.length+' relações registradas.';
}

// Sínteses descritivas baseadas na entrevista coletiva de 27/09/2026 e
// na bibliografia; requerem revisão editorial antes da publicação definitiva.
const atlasResumoEducacional={
 I108:'Escola de formação profissional e política de trabalhadores organizada por militantes da Oposição Sindical Metalúrgica e redes de educação popular. Atuou no Brás, depois na Rua Riachuelo e, posteriormente, na Sé. Cursos e oficinas articulavam saberes técnicos, organização coletiva e formação política.',
 I109:'Associação dos Trabalhadores da Região do Ipiranga, atuante desde 1979. Reuniu militantes e educadoras em cursos de matemática, geometria, preparação para o SENAI, formação sindical, atividades culturais e iniciativas de organização pela base.',
 I110:'Centro Pastoral Vergueiro, também denominado Centro de Documentação e Pesquisa Vergueiro. Ofereceu espaço e apoio à documentação e a experiências educativas, incluindo atividades do supletivo de trabalhadores da ARNO narradas na entrevista.',
 I111:'Reconstrução de Lutas Operárias, posteriormente Reconstrução – Educação, Assessoria e Pesquisa. Articulou formação de dirigentes, assessoria sindical e circulação de materiais políticos e pedagógicos em sindicatos e instâncias da CUT.',
 I114:'Associação dos Trabalhadores da Leopoldina, ligada às experiências de organização coletiva e de formação de trabalhadores na região oeste de São Paulo. A localização exata dos cursos e da sede ainda precisa ser documentada.',
 I115:'Associação dos Trabalhadores e Moradores da Zona Sul, vinculada à articulação operária e comunitária na região de Santo Amaro. Promovia organização pela base, atividades culturais, encontros e cursos políticos e profissionais.',
 I120:'União de Moradores do Parque Bristol e Jardim São Savério. Reuniu organização comunitária e alfabetização de adultos; Sueli Bossam relata participação nas atividades de ensino e nas lutas locais.',
 I126:'Conselho de Escolas de Trabalhadores, articulação entre experiências de formação de trabalhadores, metodologias e intercâmbio pedagógico. Não corresponde a uma única sede física.',
 I136:'Supletivo Avante, experiência de elevação da escolaridade de trabalhadoras e trabalhadores ligados à indústria Linhas Corrente. Sueli Bossam descreve o funcionamento na Rua do Fico, 100, Ipiranga, aproximadamente em 1977–1978, e o posterior deslocamento de atividades ao CPV.',
 I137:'Movimento de Alfabetização de Jovens e Adultos de São Paulo. Iniciativa descentralizada de alfabetização e formação de educadores, com intercâmbio de metodologias e materiais de experiências anteriores de educação popular.',
 I139:'Curso Supletivo Construindo o Saber, experiência de elevação da escolaridade de trabalhadores coordenada por Carmen Sylvia Vidigal Moraes. Sua localização física precisa continua em investigação.'
};

function showDetail(id){
  const n=nodeById.get(id);if(!n)return;
  const d=$('detail');
  const resumoMovimento={
    M001:'Articulação sindical e política de trabalhadores e trabalhadoras metalúrgicos de São Paulo, com atuação na democratização sindical, nas comissões de fábrica, na formação profissional e na educação popular durante a ditadura e a redemocratização. Incluiu militantes operários e participantes constitutivos de iniciativas pedagógicas, documentais e de organização.',
    M018:'Corrente de atuação político-sindical formada no interior da Central Única dos Trabalhadores, com participação de militantes oriundos de diferentes oposições sindicais, inclusive da OSM-SP.',
    M019:'Coletivo constituído no período democrático recente e relacionado a ações de memória e defesa da democracia. Seu vínculo de articulação com a rede histórica da OSM-SP não equivale a filiação sindical no período ditatorial.'
  };
  let descricao=first(n.raw,['Biography_ORIG','Description_ORIG','HistoricalDescription','Notes','AnalyticalNote','Biography_EN']) || text(miniBiografias[id]) || text(atlasResumoEducacional[id]) || text(resumoMovimento[id]);
  if(!descricao&&n.kind==='Movimento')descricao='Movimento registrado na pesquisa. Síntese histórica específica ainda não cadastrada.';
  let out='<button type="button" id="closeDetail" aria-label="Fechar painel">×</button>';
  if(n.photo)out+='<img src="'+HTML(n.photo)+'" alt="Retrato de '+HTML(n.label)+'">';
  out+='<h3>'+HTML(n.label)+'</h3>';
  if(descricao)out+='<p class="mini-bio">'+HTML(descricao)+'</p>';
  else if(n.kind==='Pessoa')out+='<p class="mini-bio">Minibiografia ainda não disponível nesta versão pública.</p>';

  const ligados=(typeof arestasSociais==='function'?arestasSociais():edgeRows.filter(e=>{
    const a=nodeById.get(e.from),b=nodeById.get(e.to);
    return a&&b&&['Pessoa','Instituição','Movimento'].includes(a.kind)&&['Pessoa','Instituição','Movimento'].includes(b.kind);
  })).filter(e=>e.from===id||e.to===id);
  const unicos=new Map();
  for(const e of ligados){
    const outra=e.from===id?e.to:e.from,v=nodeById.get(outra);
    if(!v)continue;const rel=roleLabel(e.relation);
    const chave=outra+'|'+e.relation;
    if(!unicos.has(chave))unicos.set(chave,{nome:v.label,papel:rel,tipo:v.kind});
  }
  if(unicos.size){
    const lista=[...unicos.values()].sort((a,b)=>(a.tipo==='Movimento'?-1:a.tipo==='Instituição'?0:1)-(b.tipo==='Movimento'?-1:b.tipo==='Instituição'?0:1) || a.nome.localeCompare(b.nome,'pt'));
    out+='<details class="atlas-context"><summary>Participação e vínculos ('+lista.length+')</summary><ul>';
    out+=lista.map(x=>'<li>'+HTML(x.papel)+': <strong>'+HTML(x.nome)+'</strong></li>').join('');
    out+='</ul></details>';
  }
  if(n.kind==='Pessoa'){
    const diretamenteOSM=ligados.some(e=>(e.from===id&&e.to==='M001')||(e.to===id&&e.from==='M001'));
    if(!diretamenteOSM)out+='<p class="muted" style="font-size:12px">Não há vínculo individual direto com a OSM-SP registrado nas matrizes; a presença no Atlas pode decorrer de outras trajetórias de resistência.</p>';
    const eventos=new Map(rows('Events').map(e=>[text(e.EventID),e]));
    const vivencias=new Map();
    for(const r of rows('EventPersons')){
      if(text(r.PersonID)!==id)continue;const e=eventos.get(text(r.EventID));if(!e)continue;
      const tipo=eventLabel(e.EventType),papel=roleLabel(r.Role),chave=papel+'|'+tipo;
      if(!vivencias.has(chave))vivencias.set(chave,{papel,tipo,total:0});vivencias.get(chave).total++;
    }
    if(vivencias.size){out+='<details class="atlas-context"><summary>Acontecimentos e experiências ('+vivencias.size+')</summary><ul>';
      for(const v of vivencias.values())out+='<li>'+HTML(v.papel)+': '+HTML(v.tipo)+(v.total>1?' ('+v.total+' registros)':'')+'</li>';out+='</ul></details>';
    }
    const documentos=new Map(rows('Documents').map(doc=>[text(doc.DocumentID),doc]));
    const titulos=new Map();for(const r of rows('DocumentPersons')){
      if(text(r.PersonID)!==id)continue;const doc=documentos.get(text(r.DocumentID));if(!doc)continue;
      const nome=first(doc,['Title_ORIG','DisplayTitle_ORIG','DisplayTitle_EN','Title_EN','Repository']);if(nome)titulos.set(text(r.DocumentID),nome);
    }
    if(titulos.size){out+='<details class="atlas-context"><summary>Fontes documentais ('+titulos.size+')</summary><ul>';
      for(const nome of titulos.values())out+='<li>'+HTML(nome)+'</li>';out+='</ul></details>';
    }
  }
  d.innerHTML=out;d.hidden=false;$('closeDetail').onclick=()=>d.hidden=true;
}

function updateCounts(){
  const keys=[['Persons','Pessoas'],['Institutions','Instituições'],['Movements','Movimentos'],['Events','Acontecimentos'],['Documents','Documentos'],['Concepts','Conceitos']];
  const html=keys.map(([k,l])=>'<div class="stat"><strong>'+rows(k).length+'</strong>'+l+'</div>').join('');
  if($('summary'))$('summary').innerHTML=html;if($('dataCounts'))$('dataCounts').innerHTML=html;updateDataTable();
}
const tiposLocaisPT={neighborhood:'Bairro',landmark:'Lugar de memória',city:'Cidade',municipality:'Município',factory:'Fábrica',prison:'Estabelecimento prisional',union:'Sindicato',workplace:'Local de trabalho',church:'Igreja',square:'Praça',military_base:'Instalação militar',police_station:'Unidade policial',residence:'Residência',park:'Parque',street:'Rua',region:'Região',building:'Edifício',institution:'Instituição',hospital:'Hospital',cemetery:'Cemitério'};
const tipoLocalPT=v=>tiposLocaisPT[text(v)]||text(v).replace(/_/g,' ');

function updateMap(){
 if(!document.getElementById('mapa').classList.contains('active'))return;
 if(!window.L){$('mapStatus').textContent='Não foi possível carregar a biblioteca do mapa.';return;}
 if(!leafletMap){
  leafletMap=L.map('map',{scrollWheelZoom:true,zoomControl:true}).setView([-23.55,-46.63],5);
  // Mantém o serviço principal (CARTO se configurado). Em falha de autenticação,
  // quota ou rede, muda automaticamente para OSM sem bloquear os marcadores.
  // ATLAS_ENTREVISTA_20261124_V2: sem chave fictícia, nem CARTO quebrado.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap contributors',
    maxZoom:19, className:'atlas-grayscale-tiles',
    crossOrigin:true
  }).addTo(leafletMap);
 }
 leafletMap.eachLayer(layer=>{if(layer instanceof L.CircleMarker)leafletMap.removeLayer(layer);});
 const chosen=$('mapConcept').value;
 let events=rows('Events');
 if(chosen&&chosen!=='ALL'){
  const ids=new Set(rows('EventConcepts').filter(e=>e.ConceptID===chosen).map(e=>e.EventID));
  events=events.filter(e=>ids.has(e.EventID));
 }
 const eventCounts=new Map();for(const e of events){const id=text(e.PlaceID);if(id)eventCounts.set(id,(eventCounts.get(id)||0)+1);}
 let total=0;const coords=[];let eventPlaces=0;
 for(const r of rows('Locations')){
   const latRaw=text(r.Latitude),lonRaw=text(r.Longitude);if(!latRaw||!lonRaw)continue;
   const lat=Number(latRaw.replace(',','.')),lon=Number(lonRaw.replace(',','.'));
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
   const ne=eventCounts.get(text(r.PlaceID))||0;
   // Filtrar por categoria somente quando a opção está selecionada; na visão geral, todas as localizações.
   if(chosen&&chosen!=='ALL'&&ne===0)continue;
   const isEvent=ne>0 || /^(true|1|v|verdadeiro)$/i.test(text(r.Source_MDH));
   const label=first(r,['PlaceName_ORIG','PlaceName_EN','PlaceName'])||r.PlaceID;
   const radius=$('heat').checked?Math.max(6,Math.min(35,Math.sqrt(ne)*8)):7;
   const memoria=historicosLocais[text(r.PlaceID)]||{};
   const born=rows('Persons').filter(p=>text(p.BirthPlaceID)===text(r.PlaceID)).map(p=>p.Name);
   const died=rows('Persons').filter(p=>text(p.DeathPlaceID)===text(r.PlaceID)).map(p=>p.Name);
   const relacionados=events.filter(e=>text(e.PlaceID)===text(r.PlaceID));
   const eventPersonIds=new Map();
   for(const ep of rows('EventPersons')){
     if(!eventPersonIds.has(ep.EventID))eventPersonIds.set(ep.EventID,[]);
     eventPersonIds.get(ep.EventID).push(ep.PersonID);
   }
   const descr=first(r,['MDH_Summary','Notes','MDH_Summary_EN'])||text(memoria.descricao);
   let detalhes='<h3>'+HTML(label)+'</h3>';
   const endereco=first(r,['Address'])||text(memoria.endereco);
   if(endereco)detalhes+='<p class="map-address">'+HTML(endereco)+'</p>';
   detalhes+='<p><b>Município:</b> '+HTML(r.Municipality)+' · '+HTML(r.State)+'</p>';
   detalhes+='<p><b>Categoria:</b> '+HTML(tipoLocalPT(r.PlaceType))+'</p>';
   if(descr)detalhes+='<h4>Histórico do local</h4><div class="map-history">'+HTML(descr)+'</div>';
   else detalhes+='<p class="auxiliary">Este local ainda não possui síntese histórica pública cadastrada. Consulte as fontes relacionadas abaixo.</p>';
   if(born.length)detalhes+='<p><b>Nascimentos associados:</b> '+HTML([...new Set(born)].join(', '))+'</p>';
   if(died.length)detalhes+='<p><b>Falecimentos associados:</b> '+HTML([...new Set(died)].join(', '))+'</p>';
   detalhes+='<h4>Acontecimentos relacionados ('+relacionados.length+')</h4>';
   if(relacionados.length){
      detalhes+='<ul class="map-events">'+relacionados.slice(0,35).map(ev=>{
        const people=(eventPersonIds.get(ev.EventID)||[]).map(pid=>nodeById.get(pid)?.label).filter(Boolean);
        const dates=[text(ev.StartDate),text(ev.EndDate)].filter(Boolean).join(' – ');
        return '<li><b>'+HTML(eventLabel(ev.EventType))+'</b>'+(dates?' · '+HTML(dates):'')+
          (people.length?' — '+HTML([...new Set(people)].join(', ')):'')+'</li>';
      }).join('')+'</ul>';
   }else detalhes+='<p class="auxiliary">Nenhum evento diretamente vinculado a este identificador na tabela Events.</p>';
   if(text(r.Source_MDH).toUpperCase()==='TRUE' || memoria.fonte==='MDH'){
     detalhes+='<p class="map-source">Fonte da síntese: Ministério dos Direitos Humanos e da Cidadania, ObservaDH. Conferir o registro original para citação integral.</p>';
   }
   detalhes+='<p class="auxiliary">Identificador: '+HTML(r.PlaceID)+' · Coordenadas: '+lat+', '+lon+'</p>';
   L.circleMarker([lat,lon],{
      radius,
      color: /^(?:SP|São Paulo|Sao Paulo)$/i.test(text(r.State))?'#B52319':(isEvent?'#9D2235':'#808080'),
      fillColor: /^(?:SP|São Paulo|Sao Paulo)$/i.test(text(r.State))?'#FF2B1F':(isEvent?'#9D2235':'#9AA0A6'),
      weight:1.4, fillOpacity:$('heat').checked?.42:.77
    })
    .addTo(leafletMap).bindPopup('<strong>'+HTML(label)+'</strong><br>'+HTML(text(r.Municipality))+'<br>Acontecimentos: '+ne)
    .on('click',()=>{$('mapSide').innerHTML=detalhes;});
   total++;if(isEvent)eventPlaces++;coords.push([lat,lon]);
 }
 leafletMap.__atlasCoords=coords;
 // Não zerar a aproximação escolhida ao trocar de aba ou mexer na intensidade.
 if(coords.length&&!primeiroAjusteMapa){leafletMap.fitBounds(coords,{padding:[25,25],maxZoom:9});primeiroAjusteMapa=true;}
 $('mapStatus').textContent=total+' locais georreferenciados · '+eventPlaces+' locais associados a eventos ou memória. Vermelho vivo = estado de São Paulo identificado; demais cores = outros locais.';
 setTimeout(()=>leafletMap.invalidateSize(),100);
}

function tableHtml(head,body){return '<table class="table"><thead><tr>'+head.map(x=>'<th>'+HTML(x)+'</th>').join('')+'</tr></thead><tbody>'+body.map(row=>'<tr>'+row.map(x=>'<td>'+HTML(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function updateLaw(){
  const items=rows('Concepts'),select=$('concept'),old=select.value;
  select.innerHTML=items.map(r=>'<option value="'+HTML(r.ConceptID)+'">'+HTML(first(r,['Label_PT','Label_ORIG','ConceptName_ORIG','Label_EN'])||r.ConceptID)+'</option>').join('');
  if(items.some(r=>r.ConceptID===old))select.value=old;
  const c=items.find(r=>r.ConceptID===select.value);
  $('conceptDetail').innerHTML=c?'<p><b>Tipo:</b> '+HTML(legalLabel(c.ConceptType))+'</p><p><b>Natureza:</b> '+HTML(legalLabel(c.ConceptNature))+'</p><p><b>Estatuto legal histórico:</b> '+HTML(legalLabel(c.HistoricalLegalStatus))+'</p><p><b>Estatuto prático:</b> '+HTML(legalLabel(c.HistoricalPracticalStatus))+'</p><p><b>Referência histórica:</b> '+HTML(legalLabel(c.HistoricalAnchor))+'</p><p><b>Referência atual:</b> '+HTML(legalLabel(c.CurrentAnchor))+'</p><hr><p><b>Nota analítica:</b><br>'+HTML(legalLabel(c.AnalyticalNote))+'</p>':'Carregue Concepts.csv para consultar o compêndio.';
  const ids=new Set(rows('EventConcepts').filter(r=>r.ConceptID===select.value).map(r=>r.EventID));
  const ev=rows('Events').filter(e=>ids.has(e.EventID));
  const evPersons=new Map();for(const ep of rows('EventPersons')){if(!evPersons.has(ep.EventID))evPersons.set(ep.EventID,[]);evPersons.get(ep.EventID).push(nodeById.get(ep.PersonID)?.label||ep.PersonID);}
  $('conceptEvents').innerHTML=ev.length?tableHtml(['Pessoa(s)','Evento','Início','Fim'],ev.map(e=>[(evPersons.get(e.EventID)||[]).join(', ')||'Em mapeamento',eventLabel(e.EventType),e.StartDate,e.EndDate])):'Os vínculos dessa categoria ainda estão em mapeamento.';
  updateConceptChart();
}
function updateConceptChart(){
  const evIDs=new Set(rows('EventConcepts').filter(r=>r.ConceptID===$('concept').value).map(r=>r.EventID));
  const years=new Map();for(const e of rows('Events')){if(!evIDs.has(e.EventID))continue;const year=/\b(?:19|20)\d{2}\b/.exec(text(e.StartDate));if(!year)continue;years.set(year[0],(years.get(year[0])||0)+1);}
  const chart=$('conceptChart');if(!years.size){chart.textContent='Não há dados cronológicos disponíveis para essa categoria.';return;}
  const vals=[...years].sort((a,b)=>+a[0]-+b[0]),max=Math.max(...vals.map(x=>x[1])),w=Math.max(550,vals.length*35),h=350;
  let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Frequência de acontecimentos por ano" style="width:100%;max-height:410px">';
  svg+='<line x1="40" y1="300" x2="'+(w-20)+'" y2="300" stroke="#888"/>';
  vals.forEach(([year,value],i)=>{const x=50+i*((w-80)/vals.length),bh=240*value/max;svg+='<rect x="'+x+'" y="'+(300-bh)+'" width="'+Math.max(9,(w-100)/vals.length-5)+'" height="'+bh+'" fill="#9D2235"><title>'+year+': '+value+' acontecimentos</title></rect><text x="'+x+'" y="320" font-size="12" fill="#666">'+year+'</text>';});
  chart.innerHTML=svg+'</svg><p class="auxiliary">Ocorrências documentadas por ano — visualização construída a partir de Events.csv e EventConcepts.csv.</p>';
}


async function restore(){
  const response=await fetch('data/atlas-estrutura.json',{cache:'no-store'});if(!response.ok)throw Error('Dados estruturais indisponíveis');
  db=await response.json();await normalize();updateAdditionalData();if($('uploadStatus'))$('uploadStatus').textContent='Estrutura da planilha atual carregada: 22 tabelas (minibiografias resumidas e estrutura pública; depoimentos e evidências integrais não são publicados).';
}
async function importFiles(list){
  const updated={};let count=0;
  for(const f of list){if(/\.json$/i.test(f.name)){const parsed=JSON.parse(await f.text());for(const [key,val] of Object.entries(parsed)){if(Array.isArray(val))updated[key]=val;}count++;continue;}let key=f.name.replace(/\.csv$/i,'').replace(/\s*\(\d+\)$/,'');if(!key)continue;if(key==='MovementInstitution')key='MovementInstitutionRelations';updated[key]=parseCSV(await f.text());count++;}
  db=updated;await normalize();updateAdditionalData();if($('uploadStatus'))$('uploadStatus').textContent=count+' tabela(s) carregada(s) localmente. Os arquivos não foram enviados ao servidor.';
}
async function cosmov(){
  const term=$('cosQuery').value.trim(),box=$('cosResults');if(!term)return;box.textContent='Consultando OpenAlex...';
  try{const response=await fetch('https://api.openalex.org/works?search='+encodeURIComponent(term)+'&per-page=15');if(!response.ok)throw Error('HTTP '+response.status);
    const result=await response.json(),works=result.results||[];box.innerHTML=works.length?tableHtml(['Ano','Título','Identificador'],works.map(w=>[w.publication_year,w.title,w.doi||w.id])):'Nenhuma publicação encontrada.';
  }catch(e){box.textContent='Falha na consulta pública: '+e.message;}
}
document.addEventListener('DOMContentLoaded',async()=>{
  document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x===b));
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.page));
    if(b.dataset.page==='mapa')setTimeout(()=>{updateMap();if(leafletMap)leafletMap.invalidateSize();},140);
    if(b.dataset.page==='grafo'&&net)setTimeout(()=>{net.redraw();},120);if(b.dataset.page==='juridico')updateConceptChart();
  }));
  $('focus').onchange=resetGraph;$('role').onchange=drawGraph;
  $('reset').onclick=()=>{$('focus').value='';resetGraph();};
  $('expand').onclick=()=>{if(selected)expand(selected,50);else hubs.forEach(h=>{if(nodeById.has(h))neighbors(h).slice(0,8).forEach(x=>visible.add(x));});drawGraph();};
  $('concept').onchange=()=>{updateLaw();updateConceptChart();};
  if($('csvUpload'))$('csvUpload').onchange=async e=>{try{await importFiles([...e.target.files]);}catch(err){if($('uploadStatus'))$('uploadStatus').textContent='Erro: '+err.message;}};
  if($('restore'))$('restore').onclick=()=>restore().catch(e=>{if($('uploadStatus'))$('uploadStatus').textContent=e.message;});
  $('cosSearch').onclick=cosmov;setupAdditionalUI();
  try{manifest=await (await fetch('assets/people/manifest.json')).json();
   const b=await fetch('data/minibiografias-publicas.json');if(b.ok)miniBiografias=await b.json();
   try{const resp=await fetch('data/lugares-memoria.json');if(resp.ok)historicosLocais=await resp.json();}catch(e){console.info('Descrição pública de lugares não disponível',e);}
   await restore();}
  catch(e){if($('uploadStatus'))$('uploadStatus').textContent=e.message;$('network').textContent=e.message;}
});


// Componentes fiéis à estrutura original, sem servidor R permanente.
const localizations={Person:'Pessoa',Institution:'Instituição',Movement:'Movimento',Event:'Evento',Location:'Local',Concept:'Conceito',Document:'Documento'};
const subjectTypes={Person:'Pessoa',Document:'Documento',Institution:'Instituição',Movement:'Movimento',Event:'Evento',Location:'Local',Concept:'Conceito'};
const typeToKind={Person:'Pessoa',Document:'Documento',Institution:'Instituição',Movement:'Movimento',Event:'Evento',Location:'Local',Concept:'Conceito'};
const kindToType=Object.fromEntries(Object.entries(typeToKind).map(([k,v])=>[v,k]));
function setupAdditionalUI(){
  document.querySelectorAll('input[name="graphMode"]').forEach(x=>x.onchange=()=>{
    const mode=document.querySelector('input[name="graphMode"]:checked')?.value||'overview';
    const s=$('focus');const options=[...nodeById.values()].filter(n=>
      mode==='person'?n.kind==='Pessoa':mode==='organization'?['Movimento','Instituição'].includes(n.kind):false
    ).sort((a,b)=>a.label.localeCompare(b.label,'pt'));
    s.innerHTML=mode==='overview'?'<option value="">Todas as pessoas</option>':
      '<option value="">Selecione...</option>'+options.map(n=>'<option value="'+HTML(n.id)+'">'+HTML(n.label)+'</option>').join('');
    resetGraph();
  });

  $('heat').onchange=updateMap;
  $('mapConcept').onchange=()=>{primeiroAjusteMapa=false;updateMap();};
  $('legalEventsTab').onclick=()=>showLegalTab(false);$('legalTrendsTab').onclick=()=>showLegalTab(true);
  $('dataFilter').oninput=()=>{dataPage=0;updateDataTable();};$('datasetSelect').onchange=()=>{dataPage=0;updateDataTable();};
  if($('exportSelected'))$('exportSelected').onclick=exportDataTable;
  $('subject').onchange=refreshPredicates;$('predicate').onchange=refreshObjects;
  $('runQuery').onclick=executeQuery;
}
function showLegalTab(trends){
  $('legalTrendsTab').classList.toggle('active',trends);$('legalEventsTab').classList.toggle('active',!trends);
  $('conceptEvents').hidden=trends;$('conceptChart').hidden=!trends;
}
function updateAdditionalData(){
  const s=$('subject'),old=s.value;
  s.innerHTML='<option value="">Selecione...</option>'+Object.entries(subjectTypes).map(([x,label])=>'<option value="'+x+'">'+label+'</option>').join('');
  if(subjectTypes[old])s.value=old;
  refreshPredicates();refreshMapConcept();renderDatasetOptions();updateDataTable();updateConceptChart();
}
// Categoria de exploração. Não é predicado RDF adicional.
const atlasPapeisDeEducacao=new Set(['teacher','professor','educator','teacher_trainer']);
function atlasPredicadoConfere(e,valor){return valor==='__educacao__'?(
 atlasPapeisDeEducacao.has(e.relation)&&nodeById.get(e.to)?.kind==='Instituição'
):e.relation===valor;}

function refreshPredicates(){
  const kind=typeToKind[$('subject').value],eligible=new Set(edgeRows.filter(e=>nodeById.get(e.from)?.kind===kind).map(e=>e.relation));
  $('predicate').innerHTML='<option value="">Selecione o predicado...</option>'+(kind==='Pessoa'?'<option value="__educacao__">Atuação educacional — docência e formação (agrupadas)</option>':'')+[...eligible].sort().map(x=>'<option value="'+HTML(x)+'">'+HTML(roleLabel(x))+'</option>').join('');
  const icon={Person:'Pessoas',Institution:'Instituicoes',Movement:'Movimentos',Event:'Eventos',Concept:'Conceitos',Document:'Documentos',Location:'Locais'};
  $('iconSubject').src='icons/'+(icon[$('subject').value]||'Pessoas')+'.png';
  refreshObjects();
}
function refreshObjects(){
  const kind=typeToKind[$('subject').value],pred=$('predicate').value;
  const eligible=new Set(edgeRows.filter(e=>nodeById.get(e.from)?.kind===kind&&atlasPredicadoConfere(e,pred)).map(e=>nodeById.get(e.to)?.kind));
  $('object').innerHTML='<option value="">Selecione o objeto...</option>'+[...eligible].filter(Boolean).map(k=>'<option value="'+(kindToType[k]||'')+'">'+HTML(k)+'</option>').join('');
  const icon={Pessoa:'Pessoas',Instituição:'Instituicoes',Movimento:'Movimentos',Evento:'Eventos',Conceito:'Conceitos',Documento:'Documentos',Local:'Locais'};
  const k=typeToKind[$('object').value];$('iconObject').src='icons/'+(icon[k]||'Movimentos')+'.png';
}
function executeQuery(){
  const btn=$('runQuery');btn.classList.add('is-loading');setTimeout(()=>btn.classList.remove('is-loading'),1700);
  const sparql=$('sparqlText').value.trim();let matching=[],limit=100;
  if(sparql){
    // Subconjunto documentado: uma única tripla SELECT com variáveis; sem FILTER, JOIN ou PREFIX.
    const m=/select\s+([\s\S]*?)\s+where\s*\{\s*([^{}]+?)\s*\}\s*(?:limit\s+(\d+))?\s*$/i.exec(sparql);
    if(!m||m[2].includes(';')||m[2].includes(',')||/\b(filter|optional|union|bind|service)\b/i.test(m[2])){
      $('sparqlResults').textContent='A versão local aceita somente SELECT com um padrão de tripla e LIMIT. Consultas SPARQL completas dependem do mecanismo RDF/Fuseki.';return;
    }
    const parts=m[2].trim().replace(/\s*\.\s*$/,'').split(/\s+/);if(parts.length!==3){$('sparqlResults').textContent='Use um padrão simples: SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10';return;}
    limit=Math.min(2000,Number(m[3])||100);matching=edgeRows.filter(e=>{
      const matches=(pat,val)=>pat.startsWith('?')||pat===val||pat.replace(/^ex:/,'')===val;
      return matches(parts[0],e.from)&&matches(parts[1],e.relation)&&matches(parts[2],e.to);
    });
  }else{
    const type=typeToKind[$('subject').value],pred=$('predicate').value,target=typeToKind[$('object').value];
    matching=edgeRows.filter(e=>(!type||nodeById.get(e.from)?.kind===type)&&(!pred||atlasPredicadoConfere(e,pred))&&(!target||nodeById.get(e.to)?.kind===target));
  }
  const selected=matching.slice(0,limit);
  $('sparqlResults').innerHTML=selected.length?tableHtml(['Sujeito','Predicado','Objeto','Evidência'],selected.map(e=>[nodeById.get(e.from)?.label||e.from,roleLabel(e.relation),nodeById.get(e.to)?.label||e.to,e.evidence||'Fonte não apresentada nesta versão'])):'Nenhuma relação cadastrada para esta combinação. A transcrição pode documentar novas atividades ainda pendentes de inclusão nas matrizes.';
}
function refreshMapConcept(){
  const c=$('mapConcept'),old=c.value;
  c.innerHTML='<option value="ALL">Todas as categorias</option>'+rows('Concepts').map(r=>'<option value="'+HTML(r.ConceptID)+'">'+HTML(first(r,['Label_PT','Label_ORIG','Label_EN'])||r.ConceptID)+'</option>').join('');
  if(old&&[...c.options].some(x=>x.value===old))c.value=old;
}
const matrixLabels = {
  Persons:'Pessoas', Events:'Eventos', Locations:'Localizações', Documents:'Documentos',
  EventPersons:'Pessoas e eventos', DocumentEvents:'Documentos e eventos',
  DocumentPersons:'Documentos e pessoas', Institutions:'Instituições',
  Concepts:'Conceitos jurídicos', EventConcepts:'Eventos e conceitos', Movements:'Movimentos',
  PersonMovements:'Pessoas e movimentos', EventActors:'Agentes dos eventos',
  PersonInstitutions:'Pessoas e instituições', EventRoles:'Papéis nos eventos',
  EventDetails:'Detalhes dos eventos', DocumentLocations:'Documentos e locais',
  Controlled_vocab:'Vocabulário controlado', Regras_Conceitos:'Regras dos conceitos',
  InstitutionRelations:'Relações instituição–instituição',
  MovementRelations:'Relações movimento–movimento',
  MovementInstitutionRelations:'Relações movimento–instituição'
};
let dataPage=0;
const DATA_PAGE_SIZE=50;
function renderDatasetOptions(){
 const el=$('datasetSelect');if(!el)return;
 const prior=el.value;
 el.innerHTML=Object.entries(matrixLabels).map(([k,v])=>
  '<option value="'+HTML(k)+'">'+HTML(v)+' ('+rows(k).length+')</option>').join('');
 if(prior && [...el.options].some(o=>o.value===prior))el.value=prior;else el.value='Persons';
}
function updateDataTable(){
 const dest=$('dataTable'),pager=$('dataPager');if(!dest)return;
 const table=$('datasetSelect')?.value||'__links';
 const term=text($('dataFilter')?.value).toLocaleLowerCase('pt');
 let names=[],entries=[];
 if(table==='__links'){
   names=['Pessoa','Papel no vínculo','Instituição ou movimento','Evidência documental'];
   const found=edgeRows.filter(e=>nodeById.get(e.from)?.kind==='Pessoa' &&
     ['Instituição','Movimento'].includes(nodeById.get(e.to)?.kind));
   entries=found.map(e=>[nodeById.get(e.from)?.label||e.from,roleLabel(e.relation),
     nodeById.get(e.to)?.label||e.to,e.evidence]);
 }else{
   const source=rows(table);names=[...new Set(source.flatMap(x=>Object.keys(x)))];
   entries=source.map(x=>names.map(k=>{
     const v=x[k];
     return ['Role','RelationType','RelationshipType'].includes(k)?roleLabel(v):v;
   }));
 }
 if(term)entries=entries.filter(r=>r.some(v=>text(v).toLocaleLowerCase('pt').includes(term)));
 const pageCount=Math.max(1,Math.ceil(entries.length/DATA_PAGE_SIZE));
 if(dataPage>=pageCount)dataPage=0;
 const pageRows=entries.slice(dataPage*DATA_PAGE_SIZE,(dataPage+1)*DATA_PAGE_SIZE);
 dest.innerHTML='<p class="auxiliary">'+entries.length+' registros · '+(table==='__links'?'Visão relacional':HTML(matrixLabels[table]||table))+'</p>'+
   (names.length?tableHtml(names,pageRows):'<p>Esta tabela não contém registros nesta seleção.</p>');
 if(pager){
  pager.innerHTML='<span>Página '+(dataPage+1)+' de '+pageCount+'</span> '+
   '<button type="button" id="prevData" '+(dataPage===0?'disabled':'')+'>Anterior</button> '+
   '<button type="button" id="nextData" '+(dataPage===pageCount-1?'disabled':'')+'>Próxima</button>';
  $('prevData').onclick=()=>{dataPage--;updateDataTable();};
  $('nextData').onclick=()=>{dataPage++;updateDataTable();};
 }
}

function exportDataTable(){
  const term=text($('dataFilter').value).toLocaleLowerCase('pt');
  const matches=edgeRows.filter(e=>!term||[e.from,e.to,e.relation,e.evidence,nodeById.get(e.from)?.label,nodeById.get(e.to)?.label].some(x=>text(x).toLocaleLowerCase('pt').includes(term)));
  const quote=x=>'"'+text(x).replace(/"/g,'""')+'"';
  const csv=[['Origem','Relacao','Destino','Evidencia'],...matches.map(e=>[nodeById.get(e.from)?.label||e.from,roleLabel(e.relation),nodeById.get(e.to)?.label||e.to,e.evidence])].map(row=>row.map(quote).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='atlas-relacoes-filtradas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

document.addEventListener('DOMContentLoaded',()=>{
  const panel=document.getElementById('pesquisaLocal');
  if(panel && new URLSearchParams(location.search).get('pesquisa')==='1')panel.hidden=false;
});


/* ATLAS_EDUCACAO_20261124_V1 — curadoria geográfica em separado. */
const atlasIniciativas = [
  {id:'I136',nome:'Supletivo Avante — Ipiranga',periodo:'aprox. 1977–1978',
  endereco:'Rua do Fico, 100, Ipiranga, São Paulo, SP, Brasil',
  precisao:'Endereço citado na entrevista; coordenadas de geocodificador devem ser verificadas',localizavel:true,
  fonte:'',nota:'Elevação da escolaridade de trabalhadores, sobretudo da indústria Linhas Corrente. Formação ligada à experiência de Sueli Bossam. Fonte: entrevista coletiva, transcrição editada, p. 47 (p. 5 do PDF).'},
 {id:'I120',nome:'Alfabetização — União de Moradores do Parque Bristol e Jardim São Savério',periodo:'a partir de 1977, com desdobramentos posteriores',
  endereco:'Parque Bristol / Jardim São Savério, São Paulo, SP, Brasil',
  precisao:'Região documentada; sede e local das aulas não determinados',localizavel:false,
  fonte:'',nota:'Iniciativas de alfabetização e educação comunitária relatadas por Sueli Bossam. Não confundir a associação com uma escola única.'},
 {id:'I115',nome:'Associação dos Trabalhadores e Moradores da Zona Sul',periodo:'a partir de fins dos anos 1970',
  endereco:'Região de Santo Amaro, São Paulo, SP, Brasil',
  precisao:'Território de atuação; não há endereço único estabelecido',localizavel:false,
  fonte:'',nota:'Reuniões, formação sindical, cursos e atividades culturais de articulação entre trabalhadores e moradores, relatadas por Nadine e Rosângela.'},
 {id:'I111',nome:'Reconstrução de Lutas Operárias / REAP',periodo:'anos 1980',
  endereco:'São Paulo, SP, Brasil',
  precisao:'Atuação em múltiplos sindicatos e regiões; não há ponto único',localizavel:false,
  fonte:'',nota:'Assessoria e formação político-sindical, com atuação nas instâncias zonais, regionais e nacional da CUT.'},
 {id:'I110',nome:'CPV — apoio ao supletivo de trabalhadores da ARNO',periodo:'aprox. 1979–1980',
  endereco:'São Paulo, SP, Brasil',
  precisao:'A sede histórica precisa ainda necessita de verificação',localizavel:false,
  fonte:'',nota:'Sueli descreve a transferência de parte das atividades educativas para o Centro Pastoral Vergueiro após a interrupção do uso do local anterior.'},
{id:'I108', nome:'Escola Nova Piratininga — Brás', periodo:'1979–1985',
  endereco:'Rua Melo Barreto, 104, Brás, São Paulo, SP, Brasil',
  precisao:'Endereço histórico publicado; coordenada a conferir', localizavel:true,
  fonte:'https://serieucdb.emnuvens.com.br/serie-estudos/article/download/324/222/956',
  nota:'Primeira sede documentada. Não confundir com o Colégio Piratininga, instituição distinta.'},
 {id:'I108', nome:'Escola Nova Piratininga — Rua Riachuelo', periodo:'1986–1989',
  endereco:'Rua Riachuelo, Centro, São Paulo, SP, Brasil',
  precisao:'Logradouro documentado; número não confirmado', localizavel:false,
  fonte:'https://periodicos.uff.br/trabalhonecessario/article/download/57854/34051/203785?inline=1',
  nota:'Não há número confirmado. Evitar atribuir coordenada exata.'},
 {id:'I108', nome:'Escola Nova Piratininga — Sé', periodo:'1990–1996',
  endereco:'Rua Silveira Martins, 8, Sé, São Paulo, SP, Brasil',
  precisao:'Endereço histórico publicado; coordenada a conferir',localizavel:true,
  fonte:'https://periodicos.uff.br/trabalhonecessario/article/download/57854/34051/203785?inline=1',
  nota:'Sede posterior ao período ditatorial, importante para a continuidade do projeto pedagógico.'},
 {id:'I107', nome:'IIEP — sede atual', periodo:'Endereço contemporâneo',
  endereco:'Rua Doutor Tomaz de Lima, 151, Liberdade, São Paulo, SP, Brasil',
  precisao:'Sede atual; NÃO é sede histórica da OSM-SP',localizavel:true,
  fonte:'https://www.iiep.org.br/',
  nota:'Acervo e continuidade de pesquisa/memória. Identificar separadamente da cartografia histórica.'},
 {id:'I108', nome:'Experiências formativas — Vila Matilde', periodo:'Iniciativas antecedentes da Nova Piratininga',
  endereco:'Vila Matilde, São Paulo, SP, Brasil',precisao:'Apenas bairro documentado',localizavel:false,
  fonte:'https://periodicos.uff.br/trabalhonecessario/article/download/57854/34051/203785?inline=1',
  nota:'Sem edifício ou endereço específico confirmado.'},
 {id:'I108', nome:'Experiências formativas — Tatuapé', periodo:'Iniciativas antecedentes da Nova Piratininga',
  endereco:'Tatuapé, São Paulo, SP, Brasil',precisao:'Apenas bairro documentado',localizavel:false,
  fonte:'https://periodicos.uff.br/trabalhonecessario/article/download/57854/34051/203785?inline=1',nota:'Sem edifício ou endereço específico confirmado.'},
 {id:'I108', nome:'Experiências formativas — Mooca', periodo:'Iniciativas antecedentes da Nova Piratininga',
  endereco:'Mooca, São Paulo, SP, Brasil',precisao:'Apenas bairro documentado',localizavel:false,
  fonte:'https://periodicos.uff.br/trabalhonecessario/article/download/57854/34051/203785?inline=1',nota:'Sem edifício ou endereço específico confirmado.'},
 {id:'I119', nome:'Centro de Educação, Estudos e Pesquisas (CEEP)', periodo:'Final dos anos 1990 em diante',
  endereco:'São Paulo, SP, Brasil',precisao:'Sede específica ainda não localizada',localizavel:false,
  fonte:'https://educa.fcc.org.br/scielo.php?lng=en&nrm=iso&pid=S1809-38762019000401885&script=sci_arttext&tlng=pt',
  nota:'Continuidade de itinerários educativos, não se presume ocupação do imóvel da Nova Piratininga.'},
 {id:'I137',nome:'MOVA-SP', periodo:'Desde 1989',endereco:'São Paulo, SP, Brasil',
  precisao:'Programa descentralizado; não possui ponto único',localizavel:false,
  fonte:'https://acebsp.org.br/mova-sp/',nota:'Cartografar cada núcleo somente após confirmação do local e do período.'},
 {id:'I139',nome:'Construindo o Saber',periodo:'Em pesquisa',endereco:'São Paulo, SP, Brasil',
  precisao:'Endereço da experiência ainda não identificado',localizavel:false,
  fonte:'https://cedoc.crpsp.org.br/bitstreams/93c7f35b-fff7-4391-8dc6-29094bf3bcfb/download',
  nota:'A fonte descreve a experiência educativa, mas não fornece endereço suficiente para um marcador.'},
 {id:'I109',nome:'ATRI — Associação dos Trabalhadores da Região do Ipiranga',periodo:'Em pesquisa',
  endereco:'Região do Ipiranga, São Paulo, SP, Brasil',precisao:'Região conhecida; sede não confirmada',localizavel:false,
  fonte:'',nota:'Verificar endereço na documentação da ATRI e em entrevistas antes de mapear.'}
];
const atlasEduGeoCache = new Map();
let atlasEducationLayer = null, atlasEducationVisible = false;
let atlasEduGeocodeInProgress = false;
function atlasEduCard(item,idx,withAction=false){
 const btn=withAction&&item.localizavel?'<button type="button" data-edu-find="'+idx+'">Localizar no mapa</button>':'';
 const link=item.fonte?'<a target="_blank" rel="noopener noreferrer" href="'+HTML(item.fonte)+'">Fonte</a>':'';
 return '<article class="atlas-edu-card"><strong>'+HTML(item.nome)+'</strong><small>'+HTML(item.periodo)+'</small>'+ 
  '<p>'+HTML(item.endereco)+'</p><p class="atlas-edu-precision">'+HTML(item.precisao)+'</p>'+ 
  '<p>'+HTML(item.nota)+'</p>'+btn+(link?' '+link:'')+'</article>';
}
async function atlasEduGeocode(item){
 if(atlasEduGeoCache.has(item.endereco))return atlasEduGeoCache.get(item.endereco);
 // Uso esporádico, explícito, uma solicitação por clique; não fazer geocodificação em massa.
 const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q='+encodeURIComponent(item.endereco);
 const resp=await fetch(url,{headers:{'Accept':'application/json'}});
 if(!resp.ok)throw Error('O geocodificador respondeu HTTP '+resp.status);
 const results=await resp.json(),place=results[0];
 if(!place || !/São Paulo|Sao Paulo/i.test(place.display_name))throw Error('Endereço não localizado com segurança em São Paulo.');
 const coords=[Number(place.lat),Number(place.lon)];
 if(!coords.every(Number.isFinite))throw Error('Coordenadas indisponíveis.');
 atlasEduGeoCache.set(item.endereco,coords);return coords;
}
function atlasEduShowList(container,withAction){
 container.innerHTML=atlasIniciativas.map((x,i)=>atlasEduCard(x,i,withAction)).join('');
 if(withAction)container.querySelectorAll('[data-edu-find]').forEach(button=>button.addEventListener('click',async()=>{
  const item=atlasIniciativas[+button.dataset.eduFind];if(!item.localizavel)return;
  if(atlasEduGeocodeInProgress)return;atlasEduGeocodeInProgress=true;
  button.disabled=true;button.textContent='Localizando…';
  try{
    const [lat,lon]=await atlasEduGeocode(item);
    if(!leafletMap)updateMap();
    if(!leafletMap)throw Error('Abra a aba Geografia para iniciar o mapa.');
    if(!atlasEducationLayer)atlasEducationLayer=L.layerGroup().addTo(leafletMap);
    L.circleMarker([lat,lon],{radius:12,color:'#b0160e',weight:2.5,fillColor:'#FF2B1F',fillOpacity:.9})
      .addTo(atlasEducationLayer)
      .bindPopup('<b>'+HTML(item.nome)+'</b><br>'+HTML(item.periodo)+'<br>'+HTML(item.endereco)+'<br><em>Coordenada geocodificada: verificar no acervo.</em>').openPopup();
    leafletMap.setView([lat,lon],15,{animate:false});
    button.textContent='Marcador mostrado';
  }catch(err){button.textContent='Não localizado — conferir';button.title=err.message;}
  finally{atlasEduGeocodeInProgress=false;button.disabled=false;}
 }));
}
function atlasEduInit(){
 const list=$('educationList'),toggle=$('educationToggle');
 if(list && toggle){
  atlasEduShowList(list,false);
  list.addEventListener('click',event=>{
    const el=event.target.closest('[data-edu-org]');if(!el)return;
    const id=el.getAttribute('data-edu-org');
    // Não recalcula a física nem cria vínculos: destaca a iniciativa já existente.
    if(!nodeById.has(id))return;
    selected=id;showDetail(id);
    if(net && net.focus)net.focus(id,{lock:true});
    if($('network'))$('network').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  toggle.addEventListener('click',()=>{
    list.hidden=!list.hidden;toggle.setAttribute('aria-expanded',String(!list.hidden));
  });
  list.querySelectorAll('article').forEach((article,i)=>{
    const id=atlasIniciativas[i].id;
    const b=document.createElement('button');b.type='button';b.textContent='Destacar no grafo';b.dataset.eduOrg=id;
    article.appendChild(b);
  });
 }
 const m=$('eduMapList'),mToggle=$('eduMapToggle');
 if(m&&mToggle){
  atlasEduShowList(m,true);
  mToggle.addEventListener('click',()=>{
    m.hidden=!m.hidden;mToggle.setAttribute('aria-expanded',String(!m.hidden));
    if(!m.hidden && leafletMap){leafletMap.setView([-23.5505,-46.6333],11,{animate:false});}
  });
 }
}
document.addEventListener('DOMContentLoaded',atlasEduInit);

