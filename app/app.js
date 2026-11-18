'use strict';
const KEY='aniversarios-pro-v2';
const $=id=>document.getElementById(id);
let rows=[],editing=null,remoteSha=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00').toISOString().slice(0,10)===s;
function persist(){localStorage.setItem(KEY,JSON.stringify(rows));render();}
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');rows=Array.isArray(v)?v.filter(x=>x&&typeof x.nome==='string'&&validDate(x.data_nascimento)).map(x=>({id:x.id||crypto.randomUUID(),nome:x.nome,data_nascimento:x.data_nascimento,ativo:!!x.ativo})):[];}catch{rows=[];}render();}
function render(){
 $('count').textContent='('+rows.length+')';$('records').replaceChildren();
 const q=$('search').value.toLocaleLowerCase('pt');
 for(const r of [...rows].sort((a,b)=>a.nome.localeCompare(b.nome,'pt')).filter(x=>x.nome.toLocaleLowerCase('pt').includes(q))){
 const el=document.createElement('div');el.className='item';
 const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=r.nome;
 const small=document.createElement('small');small.textContent=r.data_nascimento.split('-').reverse().join('/')+' · '+(r.ativo?'Avisos ativos':'Sem avisos');info.append(strong,small);
 const actions=document.createElement('div');actions.className='actions';
 const edit=document.createElement('button');edit.className='secondary';edit.textContent='Editar';edit.onclick=()=>{editing=r.id;$('nome').value=r.nome;$('data').value=r.data_nascimento;$('ativo').checked=r.ativo;$('formtitle').textContent='Editar aniversário';$('cancel').hidden=false;window.scrollTo({top:0,behavior:'smooth'});};
 const del=document.createElement('button');del.className='secondary';del.textContent='Eliminar';del.onclick=()=>{if(confirm('Eliminar '+r.nome+'?')){rows=rows.filter(x=>x.id!==r.id);persist();}};
 actions.append(edit,del);el.append(info,actions);$('records').append(el);
 }
 if(!$('records').children.length)$('records').textContent='Sem registos.';
}
function reset(){editing=null;$('form').reset();$('ativo').checked=true;$('cancel').hidden=true;$('formtitle').textContent='Adicionar aniversário';}
$('form').onsubmit=e=>{e.preventDefault();const nome=$('nome').value.trim(),data_nascimento=$('data').value,ativo=$('ativo').checked;
 if(!nome||!validDate(data_nascimento))return alert('Preenche nome e data válidos.');
 if(editing){const r=rows.find(x=>x.id===editing);if(r)Object.assign(r,{nome,data_nascimento,ativo});}
 else rows.push({id:crypto.randomUUID(),nome,data_nascimento,ativo});
 persist();reset();};
$('cancel').onclick=reset;$('search').oninput=render;
const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';
function csv(){return '\uFEFFnome,data_nascimento,ativo\r\n'+rows.map(r=>[r.nome,r.data_nascimento,r.ativo?'sim':'nao'].map(quote).join(',')).join('\r\n')+(rows.length?'\r\n':'');}
function parseCSV(t){
 t=t.replace(/^\uFEFF/,'');let records=[],field='',line=[],quoted=false;
 for(let i=0;i<t.length;i++){let c=t[i];if(quoted){if(c==='"'&&t[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
 else if(c==='"')quoted=true;else if(c===','){line.push(field);field='';}
 else if(c==='\n'){line.push(field.replace(/\r$/,''));records.push(line);line=[];field='';}
 else field+=c;}
 if(quoted)throw Error('CSV com aspas incompletas');
 if(field||line.length){line.push(field.replace(/\r$/,''));records.push(line);}
 const headers=records.shift()?.map(x=>x.trim().toLowerCase())||[];
 if(!['nome','data_nascimento','ativo'].every(x=>headers.includes(x)))throw Error('CSV precisa de nome,data_nascimento,ativo');
 return records.filter(x=>x.some(v=>v.trim())).map((v,i)=>{const get=k=>v[headers.indexOf(k)]?.trim()||'';
 const nome=get('nome'),data_nascimento=get('data_nascimento'),ativo=['sim','true','1'].includes(get('ativo').toLowerCase());
 if(!nome||!validDate(data_nascimento))throw Error('Registo inválido na linha '+(i+2));
 return {id:crypto.randomUUID(),nome,data_nascimento,ativo};});
}
$('export').onclick=()=>{const blob=new Blob([csv()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aniversarios.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const next=parseCSV(await f.text());if(confirm('Substituir os '+rows.length+' registos locais por '+next.length+' do CSV?')){rows=next;persist();remoteSha=null;}}catch(err){alert(err.message);}e.target.value='';};
function config(){const owner=$('owner').value.trim(),repo=$('repo').value.trim(),branch=$('branch').value.trim(),token=$('token').value.trim();
 if(!/^[\w.-]+$/.test(owner)||!/^[\w.-]+$/.test(repo)||!branch||!token)throw Error('Preenche utilizador, repositório, branch e token.');
 return {owner,repo,branch,token};}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
function unbase64(s){const bin=atob(s.replace(/\s/g,''));return Uint8Array.from(bin,c=>c.charCodeAt(0));}
async function github(method,body){
 const c=config(),url=`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/data/aniversarios.csv`;
 const opts={method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+c.token,'X-GitHub-Api-Version':'2022-11-28'}};
 if(body)opts.body=JSON.stringify(body);
 const response=await fetch(method==='GET'?url+'?ref='+encodeURIComponent(c.branch):url,opts);
 let result;try{result=await response.json();}catch{result={};}
 if(!response.ok)throw Error(`GitHub HTTP ${response.status}: ${result.message||'Erro'}`);
 return result;
}
function status(s){$('feedback').textContent=s;}
$('pull').onclick=async()=>{try{status('A carregar…');const obj=await github('GET');const next=parseCSV(new TextDecoder().decode(unbase64(obj.content)));if(!confirm('Substituir dados locais pelos '+next.length+' registos do GitHub?')){status('Cancelado.');return;}rows=next;remoteSha=obj.sha;persist();status('Dados carregados do repositório.');}catch(e){status(e.message);}};
$('push').onclick=async()=>{try{
 status('A verificar versão remota…');const c=config();let current;
 try{current=await github('GET');}catch(e){if(!e.message.includes('HTTP 404'))throw e;current=null;}
 if(current&&remoteSha&&current.sha!==remoteSha)throw Error('O CSV mudou no GitHub desde a última leitura. Carrega primeiro a versão remota e reconcilia as alterações.');
 if(!confirm('Enviar '+rows.length+' aniversários para '+c.owner+'/'+c.repo+'? Isto substitui o CSV remoto.')){status('Cancelado.');return;}
 const payload={message:'Atualizar aniversários pela aplicação Android',content:base64(new TextEncoder().encode(csv())),branch:c.branch};
 if(current)payload.sha=current.sha;
 const result=await github('PUT',payload);remoteSha=result.content?.sha||null;status('CSV atualizado no GitHub. Os avisos automáticos lerão estes dados na próxima execução.');
 }catch(e){status(e.message);}};
load();
