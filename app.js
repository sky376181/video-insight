const $=id=>document.getElementById(id);
const RULES=[
  ['hook','0–3 秒直接給痛點、反差或好奇點'],
  ['story','用一個自己的真實故事，不寫空泛說教'],
  ['turn','故事後給「原來是這樣」的反轉'],
  ['action','只給 1 個或 3 個能立刻做的方法'],
  ['share','結尾提供值得轉給朋友的理由'],
  ['voice','語氣直接、有趣，避免太溫柔的療癒感'],
  ['business','兼顧 IP 與變現，讓觀眾知道你能幫誰']
];
const REJECT=['太雞湯','太空泛','不像我的口吻','缺真實故事','沒有變現方向','開頭太慢','CTA 太硬'];
let prefs=Object.fromEntries(RULES.map(([k])=>[k,true])),rejects={},current=null,videoUrl=null,imageUrls=[];
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rate=(a,b)=>a!=null&&b>0?(a/b*100).toFixed(1)+'%':'未辨識';
const status=s=>{$('status').textContent=s;$('status').classList.add('show')};
const dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('video-insight',1);req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('settings')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function store(name,mode,fn){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let value;try{value=fn(tx.objectStore(name))}catch(e){reject(e);return}tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error)})}
async function allRecords(){const db=await dbPromise;return new Promise((resolve,reject)=>{const q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>resolve(q.result.sort((a,b)=>b.createdAt-a.createdAt));q.onerror=()=>reject(q.error)})}
async function getSetting(key){const db=await dbPromise;return new Promise(resolve=>{const q=db.transaction('settings').objectStore('settings').get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null)})}
async function saveSettings(){await store('settings','readwrite',s=>s.put({prefs,rejects},'profile'))}
function renderRules(){ $('rules').innerHTML=RULES.map(([k,label])=>`<button class="chip ${prefs[k]?'on':''}" data-rule="${k}" aria-pressed="${!!prefs[k]}">${safe(label)}</button>`).join('');$('learned').innerHTML=Object.entries(rejects).filter(([,n])=>n>0).map(([label,n])=>`<button class="chip bad" data-clear="${safe(label)}" title="點選可撤回這項偏好">${safe(label)} · ${n} 次　×</button>`).join('')||'<p class="small">還沒有回饋。分析後可點選不符合的建議。</p>'}
$('rules').addEventListener('click',async e=>{const k=e.target.closest('[data-rule]')?.dataset.rule;if(!k)return;prefs[k]=!prefs[k];renderRules();await saveSettings()});
$('learned').addEventListener('click',async e=>{const label=e.target.closest('[data-clear]')?.dataset.clear;if(!label)return;delete rejects[label];await saveSettings();renderRules()});
function switchView(view){for(const name of ['New','History','Rules']){$('tab'+name).classList.toggle('active',name===view);$(name.toLowerCase()+'View').classList.toggle('hidden',name!==view)}if(view==='History')renderHistory();if(view==='Rules')renderRules()}
for(const name of ['New','History','Rules'])$('tab'+name).onclick=()=>switchView(name);
$('images').onchange=e=>{imageUrls.forEach(URL.revokeObjectURL);const files=[...e.target.files];imageUrls=files.map(URL.createObjectURL);$('shots').replaceChildren(...imageUrls.map(url=>{const im=document.createElement('img');im.src=url;im.alt='後台數據截圖';return im}));$('imageNames').textContent=files.map(f=>f.name).join('、')};
$('videoFile').onchange=e=>{if(videoUrl)URL.revokeObjectURL(videoUrl);const f=e.target.files[0];if(!f)return;videoUrl=URL.createObjectURL(f);$('preview').src=videoUrl;$('preview').style.display='block';$('videoName').textContent=f.name+' · '+(f.size/1048576).toFixed(1)+' MB'};
function norm(s){return String(s).normalize('NFKC').replace(/[，]/g,',').replace(/[：]/g,':').replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g,'$1')}
function numberToken(s,kind){const text=norm(s).trim();if(kind==='time'){const t=text.match(/(?:\d{1,2}:)?\d{1,2}:\d{2}/);if(t){const p=t[0].split(':').map(Number);return p.reduce((a,v)=>a*60+v,0)}const sec=text.match(/(\d+(?:\.\d+)?)\s*(?:秒|sec(?:onds?)?)/i);return sec?+sec[1]:null}if(kind==='percent'){const m=text.match(/(\d+(?:\.\d+)?)\s*%/);return m&&+m[1]<=100?+m[1]:null}const m=text.match(/^(?:[:：\s=]*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([萬万kKmM])?\s*(?:次|人|次觀看|views?|plays?)?\s*$/i);if(!m)return null;const x=+m[1].replaceAll(',','')*({'萬':10000,'万':10000,k:1000,K:1000,m:1000000,M:1000000}[m[2]]||1);return x>0?x:null}
const LABELS={
 views:/觀看(?:次數|數)?|播放(?:次數|數)?|瀏覽次數|(?:video\s*)?views?|plays?/i,
 shares:/分享(?:次數|數)?|shares?/i,
 reposts:/轉發(?:次數|數)?|reposts?/i,
 saves:/收藏(?:次數|數)?|儲存(?:次數|數)?|saves?/i,
 likes:/按讚(?:次數|數)?|喜歡(?:次數|數)?|likes?/i,
 comments:/留言(?:次數|數)?|評論(?:次數|數)?|comments?/i,
 average:/平均(?:觀看|播放)(?:時間|時長|秒數)?|average\s*watch\s*time/i,
 retention:/前\s*3\s*秒(?:留存|觀看)|3[- ]?second\s*(?:retention|view)/i
};
function extractMetrics(text){const lines=norm(text).split(/\n/).map(s=>s.trim()).filter(Boolean),out={};for(const [key,re] of Object.entries(LABELS)){const kind=key==='average'?'time':key==='retention'?'percent':'count';let candidates=[];for(let i=0;i<lines.length;i++){const m=lines[i].match(re);if(!m)continue;const same=lines[i].replace(m[0],'').trim();let v=numberToken(same,kind);if(v!==null)candidates.push({value:v,confidence:'較高',line:lines[i]});const j=i+1;if(j<lines.length&&!Object.values(LABELS).some(x=>x.test(lines[j]))){v=numberToken(lines[j],kind);if(v!==null)candidates.push({value:v,confidence:'需核對',line:lines[i]+' / '+lines[j]})}}out[key]=candidates.find(x=>x.confidence==='較高')||candidates[0]||null}return out}
function ocrLines(data){return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[])).filter(x=>x.text?.trim()).map(x=>({text:norm(x.text).trim(),confidence:x.confidence,bbox:x.bbox}))}
function spatialMetrics(data){const lines=ocrLines(data),out={};for(const [key,re] of Object.entries(LABELS)){const kind=key==='average'?'time':key==='retention'?'percent':'count';let choices=[];for(const label of lines){const m=label.text.match(re);if(!m)continue;const same=numberToken(label.text.replace(m[0],'').trim(),kind);if(same!==null)choices.push({value:same,confidence:'較高',line:label.text,score:100});for(const value of lines){if(label===value||!label.bbox||!value.bbox)continue;const n=numberToken(value.text,kind),h=Math.max(12,label.bbox.y1-label.bbox.y0),dy=value.bbox.y0-label.bbox.y1,dx=Math.abs(value.bbox.x0-label.bbox.x0);if(n!==null&&dy>=-h*.3&&dy<h*4&&dx<h*8)choices.push({value:n,confidence:'需核對',line:label.text+' / '+value.text,score:80-dy/h-dx/h/3})}}choices.sort((a,b)=>b.score-a.score);out[key]=choices[0]||null}return out}
function mergeMetrics(...results){const out={};for(const key of Object.keys(LABELS)){const found=results.map(r=>r?.[key]).filter(Boolean);out[key]=found.find(x=>x.confidence==='較高')||found[0]||null}return out}
const MANUAL_FIELDS={views:'manualViews',likes:'manualLikes',comments:'manualComments',shares:'manualShares',reposts:'manualReposts',saves:'manualSaves',average:'manualAverage',retention:'manualRetention'};
function readManualMetrics(){const out={};for(const [key,id] of Object.entries(MANUAL_FIELDS)){const input=$(id),raw=input.value.trim();if(!raw)continue;const value=Number(raw);if(!Number.isFinite(value)||value<0||(key==='retention'&&value>100)||(!['average','retention'].includes(key)&&!Number.isInteger(value))){input.focus();throw new Error(`請檢查「${input.closest('label').textContent.trim()}」的數字。`)}out[key]={value,confidence:'手動輸入',line:'手動輸入'}}return out}
function applyManualMetrics(ocr,manual){return {...ocr,...manual}}
function enhancedCanvas(source,crop=null,targetWidth=1400){const sx=crop?.x||0,sy=crop?.y||0,sw=crop?.width||source.width,sh=crop?.height||source.height,scale=Math.min(2,Math.max(1,targetWidth/sw)),c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,sx,sy,sw,sh,0,0,c.width,c.height);const img=ctx.getImageData(0,0,c.width,c.height),d=img.data;let sample=0,count=0;for(let i=0;i<d.length;i+=Math.max(4,Math.floor(d.length/12000/4)*4)){sample+=(d[i]*.299+d[i+1]*.587+d[i+2]*.114);count++}const invert=sample/count<130;for(let i=0;i<d.length;i+=4){let v=d[i]*.299+d[i+1]*.587+d[i+2]*.114;if(invert)v=255-v;v=Math.max(0,Math.min(255,(v-128)*1.45+128));d[i]=d[i+1]=d[i+2]=v}ctx.putImageData(img,0,0);return c}
async function recognizeScreenshot(worker,file){const first=(await worker.recognize(file,{}, {blocks:true})).data;let metrics=mergeMetrics(extractMetrics(first.text),spatialMetrics(first)),raw=first.text;if(Object.values(metrics).filter(Boolean).length<3){try{const image=await createImageBitmap(file),canvas=enhancedCanvas(image,null,1600);image.close?.();const second=(await worker.recognize(canvas,{}, {blocks:true})).data;metrics=mergeMetrics(metrics,extractMetrics(second.text),spatialMetrics(second));raw+='\n\n--- 增強辨識 ---\n'+second.text}catch(e){raw+='\n[增強辨識不可用，已保留原圖結果]'}}return {metrics,raw}}
function metricsValues(m){return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,v?.value??null]))}
function screenshotData(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{const scale=Math.min(1,1000/im.width),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.68))};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('截圖無法開啟'))};im.src=url})}
async function waitMetadata(video){if(Number.isFinite(video.duration)&&video.duration>0)return video.duration;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('影片無法讀取片長')),12000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve(video.duration)},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('影片格式無法讀取'))},{once:true})})}
async function frameAt(video,time){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error('影片取樣逾時'))},9000);const cleanup=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',bad)};const done=()=>{cleanup();const c=document.createElement('canvas'),scale=Math.min(1,1280/video.videoWidth);c.width=Math.max(1,Math.round(video.videoWidth*scale));c.height=Math.max(1,Math.round(video.videoHeight*scale));c.getContext('2d',{willReadFrequently:true}).drawImage(video,0,0,c.width,c.height);resolve(c)};const bad=()=>{cleanup();reject(new Error('影片畫面無法擷取'))};video.addEventListener('seeked',done,{once:true});video.addEventListener('error',bad,{once:true});video.currentTime=time})}
function frameDifference(a,b){const c=document.createElement('canvas');c.width=64;c.height=36;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(a,0,0,64,36);const x=ctx.getImageData(0,0,64,36).data;ctx.drawImage(b,0,0,64,36);const y=ctx.getImageData(0,0,64,36).data;let sum=0;for(let i=0;i<x.length;i+=4)sum+=Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]);return sum/(64*36*3)}
function uniqueTimes(duration){const end=Math.max(0,duration-.05),opening=[.2,1.2,2.5].filter(t=>t<duration),rest=Array.from({length:9},(_,i)=>Math.max(3,duration*(i+1)/10));return [...new Set([...opening,...rest].map(t=>Math.min(Math.max(0,t),end).toFixed(1)))].map(Number)}
function cleanCaption(data){const candidates=ocrLines(data);const lines=candidates.length?candidates:[{text:data.text||'',confidence:data.confidence||0}];return lines.filter(({text,confidence})=>{const cjk=(text.match(/[\u3400-\u9fff]/g)||[]).length,words=text.match(/[A-Za-z]{3,}/g)||[],junk=(text.match(/[|_~^]/g)||[]).length;return junk<3&&((cjk>=4&&confidence>=42)||(cjk>=2&&confidence>=70)||(words.length>=3&&confidence>=55))}).map(x=>x.text).slice(0,3).join(' ').slice(0,110)}
async function videoAnalysis(worker){
 const video=$('preview'),duration=await waitMetadata(video),captions=[];
 if(!Number.isFinite(duration)||duration<=0)throw new Error('影片時長無法讀取');
 const times=uniqueTimes(duration);let firstFrame=null,openingChange=null;
 for(let i=0;i<times.length;i++){
  status(`辨識影片文字 ${i+1}/${times.length}…`);
  try{
   const frame=await frameAt(video,times[i]);
   if(i===0)firstFrame=frame;
   else if(i===1&&firstFrame){openingChange=frameDifference(firstFrame,frame);firstFrame=null}
   let data=(await worker.recognize(frame,{}, {blocks:true})).data,text=cleanCaption(data);
   if(!text&&(i<3||i%3===0)){
    const enhanced=enhancedCanvas(frame,null,1500);
    data=(await worker.recognize(enhanced,{}, {blocks:true})).data;
    text=cleanCaption(data)
   }
   captions.push({at:times[i],text})
  }catch(e){captions.push({at:times[i],text:''})}
 }
 return {duration,captionSamples:captions,openingChange}
}
function scriptInsight(source){
 const parts=source.split(/(?<=[。！？!?])|\n+/).map(s=>s.trim()).filter(Boolean);
 const excerpt=s=>s.length>105?s.slice(0,105)+'…':s;
 const first=parts[0]||source.slice(0,105),last=parts.at(-1)||first;
 const story=parts.slice(1).find(s=>/我|自己|那天|當時|以前/.test(s))||'';
 const turn=parts.find(s=>/原本以為|後來發現|才發現|沒想到|其實/.test(s))||parts.find(s=>/結果/.test(s))||'';
 const action=parts.find(s=>/第一步|你可以|試著|先做|方法|步驟/.test(s))||'';
 const advice=[];
 if(prefs.hook)advice.push(['開場承諾｜先交代看點',`第一句「${excerpt(first)}」。${/^(大家好|嗨|哈囉|今天要|我是)/.test(first)?'開場先用原稿中的具體衝突或轉變，招呼移到後面。':'確認這句說的是觀眾的處境或能得到的結果，而非只有主題名稱。'} 下一版只更換第一句與第一格畫面，主體不變，觀察前 3 秒留存是否提升。`]);
 if(prefs.story)advice.push(['敘事證據｜讓觀點可信',story?`原稿的故事線索「${excerpt(story)}」。補足當時的場景、做過的動作和結果；若只是「我覺得」，觀眾較難看見轉變。`:'目前未找到明確的個人事件。若走故事型，請用一個真實片段交代場景、動作、代價；若走教學型，不必為了公式硬塞故事。']);
 if(prefs.turn)advice.push(['訊息轉折｜兌現開場承諾',turn?`轉折句「${excerpt(turn)}」。檢查它是否回答了開場提出的問題；讓「原本以為」和「後來發現」各有具體內容。`:'如果開場設下反差或疑問，中段要有明確答案；若沒有觀點轉折，不必硬寫「後來發現」。']);
 if(prefs.action)advice.push(['可用價值｜讓觀眾有理由保存',action?`方法線索「${excerpt(action)}」。再明確一級：對象、第一步、完成時看什麼結果；能照做才有保存價值。`:'若影片承諾解法，請交付一個可立即執行的步驟；若是純共鳴故事，則以可轉述的洞見收束，不必強加教學。']);
 if(prefs.share)advice.push(['傳播情境｜分享給誰',`結尾「${excerpt(last)}」。${/分享|轉給|傳給|留言|收藏/.test(last)?'確認觀眾轉給朋友前，已先得到值得轉述的一句話。':'若目標是分享，請具體點出適合轉給哪一種處境的朋友，避免泛稱「分享出去」。'}`]);
 if(prefs.business)advice.push(['帳號定位｜觀眾為何追蹤','若這支目標是累積個人 IP，最後要讓觀眾知道你持續談哪類問題、下次追蹤能得到什麼；若是純故事片，可先用共鳴建立信任，不必硬置入產品。']);
 if(rejects['太空泛'])advice.push(['你曾回饋：太空泛','把抽象詞換成原稿裡真實發生的事或能拍到的動作；沒有素材的地方不編造。']);
 if(rejects['開頭太慢'])advice.unshift(['你曾回饋：開頭太慢','把背景資訊移到痛點之後，第一句直接進入事件。']);
 if(rejects['太雞湯']||rejects['不像我的口吻'])advice.push(['你的口吻','保留你原稿裡直接、有趣的說法，刪掉空泛的鼓勵句。']);
 if(rejects['缺真實故事'])advice.push(['你曾回饋：缺真實故事','用你親身經歷的一個場景承接觀點，不編造故事。']);
 if(rejects['沒有變現方向'])advice.push(['你曾回饋：沒有變現方向','在結尾自然說明你能幫哪一種人，不硬塞購買口號。']);
 if(rejects['CTA 太硬'])advice.push(['你曾回饋：CTA 太硬','先給值得傳給朋友的理由，再決定是否需要直接要求分享。']);
 const draft=[`【開場 A｜原句】\n${excerpt(first)}`,`【開場 B｜待測方向】\n${/^(大家好|嗨|哈囉|今天要|我是)/.test(first)?`可從原稿的${story?'真實事件「'+excerpt(story)+'」':turn?'觀點轉折「'+excerpt(turn)+'」':'具體問題'}切入；只保留能在前三秒講清楚的核心句。`:'把原句的對象、問題或結果提前；不要額外製造原稿沒有的承諾。'}`,story?`【故事證據】\n${excerpt(story)}\n補足具體場景、你做了什麼，以及結果。`:'【故事證據】\n若採故事型，補一段真實經歷；純教學片可略過。',turn?`【觀點兌現】\n${excerpt(turn)}`:'【觀點兌現】\n回答開場留下的問題，不必刻意製造反轉。',action?`【可執行價值】\n${excerpt(action)}\n檢查觀眾照做的第一步是否清楚。`:'【可執行價值】\n教學片交付一個可執行步驟；共鳴片交付一個可轉述洞見。',`【結尾原句】\n${excerpt(last)}`,`【分享收尾｜若這支以分享為目標】\n先把「${excerpt(turn||action||story||first)}」濃縮成一句能獨立理解的觀察，再說明哪種朋友會用得上。`,`【留言收尾｜若這支以互動為目標】\n圍繞「${excerpt(story||turn||first)}」問一個具體問題，例如「如果是你遇到這種情境，第一步會怎麼做？」先說出你自己的做法，再邀請觀眾回一個動作。`,`【測試設計】\n完播、分享、留言的收尾是不同版本的候選方案；下一支只改一個主要變因。在同平台、相近片長下分別比較留存、分享率或留言率；不要把這份方向當成對成效的保證。`].join('\n\n');
 return {advice,draft,opening:first}
}
function scriptParts(source){
 const parts=String(source||'').split(/(?<=[。！？!?])|\n+/).map(s=>s.trim()).filter(Boolean);
 return {first:parts[0]||'',last:parts.at(-1)||'',parts};
}
const quote=s=>s.length>82?s.slice(0,82)+'…':s;
const MEDIAN=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
function historyMatches(history,source,m,video){
 const words=s=>{const clean=String(s||'').replace(/[\s\p{P}\p{S}]+/gu,'');const tokens=new Set();for(let i=0;i<clean.length-1;i++)tokens.add(clean.slice(i,i+2));return tokens};
 const current=words(source),v=metricsValues(m),results=[];
 for(const r of history){
  if(!r?.id||!r.metrics)continue;
  const old=words(r.sourceScript),common=[...current].filter(w=>old.has(w)).length;
  const textScore=current.size>=8&&old.size>=8?common/Math.min(current.size,old.size):0;
  const oldV=metricsValues(r.metrics),duration=video?.duration,oldDuration=r.video?.duration;
  const durationMatch=duration&&oldDuration&&Math.abs(duration-oldDuration)/Math.max(duration,oldDuration)<=.3;
  const retentionMatch=v.retention!=null&&oldV.retention!=null&&Math.abs(v.retention-oldV.retention)<=10;
  const shareMatch=v.views>0&&oldV.views>0&&v.shares!=null&&oldV.shares!=null&&Math.abs(v.shares/v.views-oldV.shares/oldV.views)<=.005;
  // Require actual script overlap; similar numbers alone do not imply similar content.
  if(textScore>=.21&&common>=5)results.push({record:r,score:textScore+(durationMatch?.08:0)+(retentionMatch?.04:0)+(shareMatch?.03:0),reason:`腳本相近${durationMatch?'、片長接近':''}${retentionMatch?'、前 3 秒留存接近':''}`});
 }
 return results.sort((a,b)=>b.score-a.score).slice(0,3);
}
function fourPartAnalysis(m,video,history,source,caption){
 const v=metricsValues(m),{first,last,parts}=scriptParts(source||caption),known=!!(source||caption),opening=quote(first),ending=quote(last);
 const comparable=history.filter(r=>!video?.duration||!r.video?.duration||Math.abs(video.duration-r.video.duration)/Math.max(video.duration,r.video.duration)<=.3);
 const prior=(key)=>comparable.map(r=>{const n=r.metrics?.[key]?.value;return typeof n==='number'&&Number.isFinite(n)?n:null}).filter(n=>n!=null);
 const retentionValues=prior('retention').filter(n=>n>=0&&n<=100),personal=retentionValues.length>=3?MEDIAN(retentionValues):null;
 const priorRate=key=>comparable.map(r=>{const x=r.metrics?.[key]?.value,y=r.metrics?.views?.value;return x!=null&&y>0?x/y*100:null}).filter(x=>x!=null);
 const shareHistory=priorRate('shares'),saveHistory=priorRate('saves');
 const shareBase=shareHistory.length>=3?MEDIAN(shareHistory):null,saveBase=saveHistory.length>=3?MEDIAN(saveHistory):null;
 const relative=(value,base)=>value==null||base==null?'尚無可比基準':value>base?'高於個人中位數':value<base?'低於個人中位數':'與個人中位數相同';
 const sharePct=v.views>0&&v.shares!=null?v.shares/v.views*100:null,savePct=v.views>0&&v.saves!=null?v.saves/v.views*100:null;
 const baselineNote='歷史比較僅供同平台、相近片長的影片參考；未記錄發布平台時，請自行確認可比性。';
 const retention=v.retention==null?'尚未提供前 3 秒留存，無法判斷實際停留。':`前 3 秒留存 ${v.retention}%。${personal!=null?`相較 ${retentionValues.length} 支舊片中位數 ${personal}%，${relative(v.retention,personal)}。`:'目前少於 3 支可比影片，先累積自己的基準；不以單一百分比作通用及格線。'}`;
 const painPattern=/你(?:也|是不是|有沒有|會不會)|困擾|煩惱|卡住|痛|需要|不想|想要|一直|明明|為什麼|卻|沒辦法|害怕|擔心|不敢|壓力|焦慮/;
 const problem=(painPattern.test(first)?first:'')||parts.find((s,i)=>i>0&&painPattern.test(s))||'';
 const solution=parts.find(s=>/你可以|方法|步驟|先(?:做|把|試|從)|第一步|做法|教你|試著|記得|只要/.test(s))||'';
 const story=parts.slice(1).find(s=>/我|那天|當時|以前|上次|那次|親身|朋友跟我/.test(s))||'';
 const turn=parts.find(s=>/原本以為|後來發現|才發現|沒想到|其實/.test(s))||'';
 const cta=parts.slice(-2).find(s=>/追蹤|留言|分享|轉發|收藏|儲存|傳給|標記|點連結|私訊|預約|祝你|希望你|願你|祝福/.test(s))||'';
 const engagements=v.views>0?`分享率 ${rate(v.shares,v.views)}${shareBase!=null?`（個人中位數 ${shareBase.toFixed(1)}%，${relative(sharePct,shareBase)}）`:''}；儲存率 ${rate(v.saves,v.views)}${saveBase!=null?`（個人中位數 ${saveBase.toFixed(1)}%，${relative(savePct,saveBase)}）`:''}；轉發率 ${rate(v.reposts,v.views)}。`:'觀看數不足，暫時無法計算行動率。';
 const openingTest=/^(大家好|嗨|哈囉|今天要|我是)/.test(first)?`把寒暄移走，試用原稿${story?'的真實事件「'+quote(story)+'」':turn?'的轉折「'+quote(turn)+'」':'裡的核心問題'}直接開場；第一格畫面同步呈現關鍵詞。`:'保留一個對準觀眾的問題、反差或結果；第一句和畫面要兌現同一個承諾。';
 let crossSignal='';
 if(personal!=null&&v.retention!=null&&shareBase!=null&&sharePct!=null&&v.retention<personal&&sharePct>shareBase)crossSignal='目前開場留存偏低、分享率相對較高；可能是進來的人願意轉述，但開場承接不足。這只是優先檢查方向。';
 else if(personal!=null&&v.retention!=null&&saveBase!=null&&savePct!=null&&v.retention>=personal&&savePct<saveBase)crossSignal='開場留存不低、儲存率相對較低；可以優先檢查中段是否交付了可回看的一步或清單。這不能直接證明內容價值不足。';
 const sections=[
  ['1｜開場留存：觀眾為什麼停下',`觀察｜${known?`原稿第一句「${opening}」；`: '沒有可靠的開場文字；'}${retention}\n判讀｜${known?'文字只能評估開場承諾，無法代表實際畫面與口播節奏。':'缺少腳本時不能判定是文案造成流失。'}${crossSignal?' '+crossSignal:''}\n下一支測試｜${known?openingTest:'貼上開場原句，並對照後台前 3 秒留存。'} ${baselineNote}`],
  ['2｜需求承接：有沒有值得看下去的問題',`觀察｜${known?(problem?`找到需求線索「${quote(problem)}」。`:'原稿未找到明確的觀眾困境句。'):'缺少完整文字，無法評估需求承接。'}\n判讀｜${problem?'有痛點詞不代表說中了目標觀眾；還要看對象、場景與代價是否具體。':'若開場只有主題名，觀眾可能不知道接下來能得到什麼。'}\n下一支測試｜在開場後用一句話交代「誰在什麼情境卡住、看完能得到什麼」，並檢查後續內容是否兌現，不要只加更多懸念。`],
  ['3｜內容交付：共鳴與可保存價值',`觀察｜${known?`${solution?`方法線索「${quote(solution)}」。`:'未找到明確步驟。'}${story?` 故事線索「${quote(story)}」。`:' 未找到明確個人事件。'}${turn?` 觀點轉折「${quote(turn)}」。`:''}`:'無可靠全文，無法判斷中段交付。'}${engagements}\n判讀｜${story?'故事的「場景→動作→結果」越清楚，共鳴越容易被轉述。':'故事型可補真實場景；教學型則優先交付具體步驟，不必硬塞故事。'} 分享與儲存是行為訊號，不能反推是哪一句造成。\n下一支測試｜${solution?'將方法寫到觀眾能照做的第一步，保留原有核心觀點。':'若承諾解法，加入一個可立即執行的步驟；若主打共鳴，收束成一句能轉述的洞見。'}`],
  ['4｜CTA 轉化：指令與影片目標是否一致',`觀察｜${known?(cta?`結尾「${quote(cta)}」。`:`結尾「${ending}」未找到明確動作或祝福。`):'缺少結尾文字，無法核對 CTA。'}${v.views>0?` 留言率 ${rate(v.comments,v.views)}；分享率 ${rate(v.shares,v.views)}；儲存率 ${rate(v.saves,v.views)}。`:''}\n判讀｜${cta?/祝你|希望你|願你|祝福/.test(cta)&&!/追蹤|留言|分享|轉發|收藏|儲存|傳給|私訊|預約/.test(cta)?'祝福可以是關係型收尾，但無法直接測量追蹤或轉化。':'已出現行動線索，仍要確認是否只要求一個主要動作，以及理由是否前文已建立。':'沒有清楚下一步；若影片目標是轉化，觀眾可能不知道要做什麼。'}\n下一支測試｜依這支的單一目標選 CTA：清單或教學→儲存；高共鳴→轉給特定朋友；觀點討論→留言一個容易回答的問題；系列經營→追蹤以看後續。純陪伴片可用真誠祝福收尾。`]
 ];
 return sections;
}
function historicalLearning(history,source,m,video){
 const matches=historyMatches(history,source,m,video);
 if(!source)return {matches:[],note:'本次沒有貼腳本；有數據仍會儲存，但無法可靠比對內容相似的舊影片。'};
 if(!matches.length)return {matches:[],note:'目前沒有足夠相似的舊腳本。這次的數據、四段分析與回饋會保存，供下一支影片參考。'};
 const lines=matches.map(({record:r,reason})=>{const v=metricsValues(r.metrics);const date=new Date(r.createdAt).toLocaleDateString('zh-TW');const metric=v.views>0?`分享率 ${rate(v.shares,v.views)}、儲存率 ${rate(v.saves,v.views)}、前 3 秒留存 ${v.retention==null?'未提供':v.retention+'%'}`:'觀看數未提供';const feedback=r.feedback?.length?`你當時排除：${r.feedback.join('、')}`:'當時沒有排除建議';const first=r.advice?.[0]?.[1]||r.sections?.[0]?.[1]||'無舊建議';return `${date}（${reason}）：${metric}。舊建議「${quote(first)}」；${feedback}。`});
 return {matches:matches.map(x=>x.record.id),note:`找到 ${matches.length} 支相似影片。${lines.join(' ')} 這是過往參考，不能只憑相關性證明哪個改法造成成效。`};
}
function growthDirection(m,video,history,source,caption){
 const v=metricsValues(m),{first,last,parts}=scriptParts(source||caption),known=!!(source||caption);
 const story=parts.slice(1).find(s=>/我|自己|那天|當時|以前|上次|那次|親身/.test(s))||'';
 const turn=parts.find(s=>/原本以為|後來發現|才發現|沒想到|其實|結果/.test(s))||'';
 const method=parts.find(s=>/第一步|你可以|先做|先把|步驟|方法|試著/.test(s))||'';
 const hasComment=/留言|評論|你會|你選|你的經驗/.test(last),hasShare=/分享|轉發|傳給|轉給/.test(last);
 const rateText=(key)=>v.views>0&&v[key]!=null?rate(v[key],v.views):'未提供足夠數據';
 const comparable=history.filter(r=>!video?.duration||!r.video?.duration||Math.abs(video.duration-r.video.duration)/Math.max(video.duration,r.video.duration)<=.3);
 const medianRate=key=>{const values=comparable.map(r=>{const n=r.metrics?.[key]?.value,d=r.metrics?.views?.value;return n!=null&&d>0?n/d*100:null}).filter(n=>n!=null);return values.length>=3?`${MEDIAN(values).toFixed(1)}%（${values.length} 支舊片）`:'尚無至少 3 支可比舊片'};
 const average=v.average!=null&&video?.duration?`平均觀看 ${v.average} 秒／片長 ${video.duration.toFixed(1)} 秒；平均值無法推算完播率。`:'沒有完整留存曲線或完播數據，無法判定觀眾是否看到結尾。';
 const opening=known?`原稿第一句「${quote(first)}」`:'目前沒有可靠的開場原文';
 const payoff=turn?`把原稿的轉折「${quote(turn)}」往前預告，並在中段用真實情節兌現。`:method?`提前讓觀眾知道會拿到「${quote(method)}」這個可用結果，正文再示範第一步。`:'選定一個觀眾能在片尾得到的答案；先在開場說清楚承諾，再於中段交付。';
 const shareSeed=turn||method||story;
 const sharePlan=shareSeed?`把「${quote(shareSeed)}」提煉成一句完整、可轉述的觀察，讓朋友即使沒有看過前情也能理解；只補原稿真有的細節。`:'先補一個真實事件的轉變，或一個觀眾能照做的步驟，才有值得傳給別人的內容。';
 const commentSeed=story||turn||first;
 const commentPlan=known?`圍繞「${quote(commentSeed)}」設計一題容易回答的問題：請觀眾說出自己會採取的第一個動作，或在兩種真實可行的做法中選一個；選項須由你的實際經驗決定。`:'有完整腳本後，再把原稿中具體的兩難或選擇改成一題留言問題；目前不能替這支片編情境。';
 return [
  ['完播｜讓開場的承諾在中段兌現',`原稿與數據｜${opening}。${average}${v.retention!=null?`前 3 秒留存 ${v.retention}%。`:''}\n下一版｜第一格畫面用一個看得懂的場景或結果，口播直接說明誰遇到什麼困境；${payoff}刪掉重複背景，結尾盡快回扣開場問題。\n驗證｜先看前 3 秒留存，再看留存曲線掉點與完播率（若後台有提供）；同平台、相近片長比較。只有平均觀看時，不寫「完播提升」。`],
  ['分享｜讓觀眾有一個具體的轉述理由',`原稿與數據｜${known?`目前的轉折或價值線索「${quote(shareSeed||last)}」。`:'缺少可靠全文。'}分享率 ${rateText('shares')}，轉發率 ${rateText('reposts')}；個人分享率基準 ${medianRate('shares')}。\n下一版｜${sharePlan}${hasShare?'保留原有分享指令，但檢查前文是否已給足理由。':'若這支目標是分享，最後指出哪一種處境的朋友會用得上，避免泛稱「幫我分享」。'}教學內容可另給可回看的簡短步驟，對照儲存率。\n驗證｜比較分享數／觀看數與轉發數／觀看數；流量來源與受眾不同也可能改變比率，不能把變動直接歸因於某句文案。`],
  ['留言｜用具體選擇取代空泛提問',`原稿與數據｜${known?`結尾「${quote(last)}」；`:'缺少可靠結尾文字；'}留言率 ${rateText('comments')}，個人基準 ${medianRate('comments')}。\n下一版｜${commentPlan}${hasComment?'目前有互動線索，改成只問一題，且先給自己的立場或做法。':'內容交付後再問一題；不要同時要求追蹤、分享與留言。'}避免用「你覺得呢」或為了互動設無關爭議。\n驗證｜比較留言數／觀看數，也讀留言是否真的回應影片觀點；下一支只改一個主要變因，記下你的主觀回饋。`]
 ];
}
function finishAnalysis(result,history,source,video,caption){
 result.sections=fourPartAnalysis(result.metrics,video,history,source,caption);
 result.historyContext=historicalLearning(history,source,result.metrics,video);
 result.growthPlan=growthDirection(result.metrics,video,history,source,caption);
 result.analysisVersion=3;
 return result;
}
function buildResult(m,video,raw,history=[],sourceScript=''){const v=metricsValues(m),share=rate(v.shares,v.views),save=rate(v.saves,v.views),repost=rate(v.reposts,v.views),watch=v.average!=null&&video?.duration?Math.round(v.average/video.duration*100):null,caption=[...new Set(video?.captionSamples.map(x=>x.text).filter(Boolean)||[])].join(' / ').slice(0,450),opening=video?.captionSamples.filter(x=>x.at<=3).find(x=>x.text)?.text||'';let flags=[],advice=[];
 if(v.views==null)flags.push(['觀看數未提供','沒有可靠的觀看數，這次無法計算分享、轉發與儲存率；可以直接在上方填入觀看數。']);
 if(!caption&&video&&!sourceScript)flags.push(['影片字幕未可靠辨識','目前只能確認片長與畫面變化。可直接在上方貼上完整腳本，不必等待影片文字辨識。']);
 if(v.shares!=null&&v.views>0)flags.push(['分享率 '+share,'這是分享次數除以觀看數；和你自己的其他影片比較才更有意義。']);
 if(v.reposts!=null&&v.views>0)flags.push(['轉發率 '+repost,'這是轉發次數除以觀看數；轉發與分享各自計算。']);
 if(v.average!=null&&video?.duration)flags.push(['平均觀看約為片長 '+watch+'%','平均值不能定位掉點；有留存曲線截圖時仍須看曲線。']);
 if(v.retention!=null)flags.push(['前 3 秒留存 '+v.retention+'%','開頭強弱要和你過去影片比較，不只看單支。']);
 const prior=history.map(r=>({views:r.metrics?.views?.value,shares:r.metrics?.shares?.value})).filter(x=>x.views>0&&x.shares!=null).map(x=>x.shares/x.views).sort((a,b)=>a-b);
 if(prior.length>=3&&v.views>0&&v.shares!=null){const baseline=prior[Math.floor(prior.length/2)];flags.push(['和你過去影片比較',`目前分享率 ${share}；你先前 ${prior.length} 支影片的中位數約 ${(baseline*100).toFixed(1)}%。${v.shares/v.views<baseline?' 這支可優先測試更明確的轉發情境。':' 這支的分享率高於你的過往中位數，可保留有效段落。'}`])}
 if(Object.values(m).some(x=>x?.confidence==='需核對'))flags.push(['部分數字需核對','截圖的標籤與數字不在同一行，可能配對錯誤；請對照下方辨識文字。']);
 if(sourceScript.trim()){const insight=scriptInsight(sourceScript.trim());return finishAnalysis({metrics:m,video,raw,flags,advice:insight.advice,script:insight.draft,share,save,repost,sourceScript:sourceScript.trim()},history,sourceScript.trim(),video,caption)}
 if(prefs.hook)advice.push(['0–3 秒｜先給理由',opening?`畫面辨識到「${opening}」。檢查第一格畫面與第一句是否直接指出痛點或反差。`:'前段沒有辨識到可讀字幕。第一格先放一句具體問題或反差，別從打招呼開始。']);
 if(video?.openingChange!=null&&video.openingChange<9)advice.push(['開頭畫面變化較小','前兩個取樣畫面相近。可檢查前 3 秒是否需要更早切到關鍵畫面；這不能直接判定觀眾流失。']);
 if(prefs.story)advice.push(['中段｜個人故事','只留一個真實片段：你當時怎麼做、遇到什麼、後來發現什麼。']);
 if(prefs.turn)advice.push(['後段｜反轉','給一個「我原本以為…後來發現…」的觀點轉折，避免重複開頭。']);
 if(prefs.action)advice.push(['方法｜立刻能做','選 1 個動作；如果是教學類，再拆成 3 個短步驟。']);
 if(prefs.share)advice.push(['結尾｜分享情境',rejects['CTA 太硬']?'用一句觀眾會想傳給朋友的總結收尾，不直接要求轉發。':'讓觀眾知道這支適合傳給哪一種朋友。']);
 if(prefs.business)advice.push(['IP 與變現','讓觀眾看出你擅長解決的問題，先建立信任，再自然承接產品或服務。']);
 if(rejects['開頭太慢'])advice.unshift(['你曾回饋：開頭太慢','下次把背景和自我介紹移到痛點之後，第一句直接進事件。']);
 if(rejects['太空泛'])advice.push(['你曾回饋：太空泛','每一段都換成可拍的畫面、具體動作或一句真實原話；沒有素材就標記待補，不編故事。']);
 if(rejects['缺真實故事'])advice.push(['你曾回饋：缺真實故事','至少留一個你親身遇過的場景與當時反應，別只講道理。']);
 if(rejects['沒有變現方向'])advice.push(['你曾回饋：沒有變現方向','讓結尾接到你能提供的內容、服務或產品，但不要硬塞購買口號。']);
 const tone=rejects['太雞湯']||rejects['不像我的口吻']||prefs.voice?'直接講具體經歷，不用溫柔鼓勵句。':'保持自然口吻。';
 const hook=opening?`把畫面上的「${opening}」改成對觀眾說的問題或反差；如果原句已夠直接就保留。`:'第一句先點出觀眾正在遇到的具體問題（影片前段沒有可辨識字幕）。';
 const script=[!caption?'【辨識不足】\n無法可靠讀出影片的字幕或口播，下面僅提供你的創作架構，不能當成這支影片的逐字改稿。':null,prefs.hook?`【0–3 秒｜開頭】\n${hook}`:null,prefs.story?'【3–15 秒｜你的真實故事】\n用一個具體時刻：發生什麼事 → 你當下的反應。影片沒有完整口播逐字稿，請用你的實際經驗補這段。':null,prefs.turn?'【轉折】\n「我原本以為＿＿，後來發現＿＿。」把真正的觀察填進去。':null,prefs.action?'【方法】\n只留一個現在就能做的動作，說清楚第一步。':null,prefs.share?'【結尾】\n用一句讓朋友想互傳的觀察收尾，再問一個好回答的問題。':null,`【語氣】\n${tone}`,caption?`【影片抽樣畫面文字】\n${caption}`:'【提醒】\n未讀到足夠字幕，無法判斷完整口播的論點與用字。'].filter(Boolean).join('\n\n');
 return finishAnalysis({metrics:m,video,raw,flags,advice,script,share,save,repost},history,'',video,caption);
}
function renderResult(r){
 current=r;$('results').classList.add('show');
 $('growthPlan').innerHTML=(r.growthPlan||[]).map(([h,b])=>`<div class="flag"><b>${safe(h)}</b>${safe(b)}</div>`).join('')||'<p class="small">這筆舊紀錄保存了當時的分析。重新提交原稿與數據，可產生新版三項內容方向。</p>';
 $('framework').innerHTML=(r.sections||[]).map(([h,b])=>`<div class="flag"><b>${safe(h)}</b>${safe(b)}</div>`).join('')||'<p class="small">這筆是舊版紀錄，仍可查看當時保存的完整建議。</p>';
 $('pastLearning').textContent=r.historyContext?.note||'這筆是舊版紀錄，當時的分析與回饋仍保留在歷史紀錄。';
 const rows=[['觀看數',r.metrics.views?.value],['按讚數',r.metrics.likes?.value],['留言數',r.metrics.comments?.value],['分享數',r.metrics.shares?.value],['轉發數',r.metrics.reposts?.value],['儲存數',r.metrics.saves?.value],['分享率',r.share],['轉發率',r.repost??rate(r.metrics.reposts?.value,r.metrics.views?.value)],['儲存率',r.save],['平均觀看',r.metrics.average?.value!=null?r.metrics.average.value+' 秒':null],['前 3 秒留存',r.metrics.retention?.value!=null?r.metrics.retention.value+'%':null],['片長',r.video?.duration?r.video.duration.toFixed(1)+' 秒':null]];
 $('stats').innerHTML=rows.map(([k,v])=>`<div class="stat"><small>${k}</small><strong>${safe(v??'未提供')}</strong></div>`).join('');
 $('flags').innerHTML=r.flags.map(([h,b])=>`<div class="flag"><b>${safe(h)}</b>${safe(b)}</div>`).join('');
 if(r.sourceScript)$('flags').innerHTML+=`<details><summary class="small">查看你貼上的原稿</summary><div class="raw">${safe(r.sourceScript)}</div></details>`;
 if(r.video?.captionSamples)$('flags').innerHTML+=`<details><summary class="small">查看影片抽樣辨識文字（${r.video.captionSamples.filter(x=>x.text).length} 格）</summary><div class="raw">${safe(r.video.captionSamples.map(x=>`${x.at.toFixed(1)} 秒：${x.text||'未辨識'}`).join('\n'))}</div></details>`;
 $('advice').innerHTML=r.advice.map(([h,b])=>`<div class="flag"><b>${safe(h)}</b>${safe(b)}</div>`).join('');
 $('script').textContent=r.script;$('raw').textContent=r.raw||'未上傳截圖（以手動數據為準）';
 $('feedback').innerHTML=REJECT.map(x=>`<button class="chip ${r.feedback?.includes(x)?'on bad':''}" data-reject="${safe(x)}">${safe(x)}</button>`).join('');
 $('results').scrollIntoView({behavior:'smooth',block:'start'})
}
$('feedback').onclick=async e=>{const b=e.target.closest('[data-reject]');if(!b||!current)return;const label=b.dataset.reject;if(b.classList.contains('on'))return;b.classList.add('on','bad');rejects[label]=(rejects[label]||0)+1;await saveSettings();if(current.id){current.feedback=[...(current.feedback||[]),label];await store('records','readwrite',s=>s.put(current))}renderRules()};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('script').textContent);$('copy').textContent='已複製';setTimeout(()=>$('copy').textContent='複製建議',1800)}catch(e){alert('請長按建議文字複製')}};
$('save').onclick=async()=>{if(!current)return;try{if(!current.id){current.id=crypto.randomUUID();current.createdAt=Date.now()}await store('records','readwrite',s=>s.put(current));$('save').textContent='已儲存'}catch(e){status('儲存失敗，請先下載備份或清出裝置空間。')}};
$('analyze').onclick=async()=>{
 const images=[...$('images').files],videoFile=$('videoFile').files[0],sourceScript=$('sourceScript').value.trim();
 let manual;try{manual=readManualMetrics()}catch(e){status(e.message);return}
 if(!images.length&&!videoFile&&!sourceScript&&!Object.keys(manual).length){status('請至少填一項數據、貼上腳本或上傳檔案。');return}
 const button=$('analyze');button.disabled=true;let worker;
 try{
  const texts=[],thumbs=[],reads=[];
  if(images.length||(videoFile&&!sourceScript)){
   if(window.Tesseract){status('正在準備文字辨識元件…');try{worker=await Tesseract.createWorker(['chi_tra','eng'],1,{logger:m=>{if(m.status==='recognizing text')status(`正在辨識文字 ${Math.round((m.progress||0)*100)}%…`)}})}catch(e){status('文字辨識暫時不可用，改用你手動提供的資料。')}}
   else status('文字辨識元件未載入，改用你手動提供的數據與腳本。')
  }
  for(let i=0;i<images.length;i++){
   if(worker){status(`辨識後台截圖 ${i+1}/${images.length}…`);try{const result=await recognizeScreenshot(worker,images[i]);texts.push(result.raw);reads.push(result.metrics)}catch(e){texts.push(`截圖 ${i+1} 無法辨識`)}}
   if(i<5)try{thumbs.push(await screenshotData(images[i]))}catch(e){}
  }
  const raw=texts.join('\n\n--- 下一張截圖 ---\n\n'),metrics=applyManualMetrics(mergeMetrics(...reads),manual);
  let video=null;
  if(videoFile){
   try{
    if(worker&&!sourceScript)video=await videoAnalysis(worker);
    else video={duration:await waitMetadata($('preview')),captionSamples:[],openingChange:null};
    video.name=videoFile.name
   }catch(e){status('影片片長或畫面無法讀取，仍會以手動資料完成分析。')}
  }
  const previous=await allRecords().catch(()=>[]),result=buildResult(metrics,video,raw,previous,sourceScript);
  result.images=thumbs;result.names=images.map(f=>f.name);result.id=crypto.randomUUID();result.createdAt=Date.now();renderResult(result);
  try{await store('records','readwrite',s=>s.put(result));$('save').textContent='已自動儲存';status('分析完成，已存入歷史紀錄。')}
  catch(e){status('分析完成，但本機儲存失敗；可複製建議，並確認裝置空間。')}
 }catch(e){status('分析未完成：'+(e?.message||'請稍後重試。'))}
 finally{button.disabled=false;if(worker)await worker.terminate().catch(()=>{})}
};
async function renderHistory(){try{const rows=await allRecords();$('history').innerHTML=rows.map(r=>`<div class="record"><button class="secondary" data-id="${safe(r.id)}" style="border:0;padding:0;text-align:left;color:#f5f1ed"><b>${new Date(r.createdAt).toLocaleString('zh-TW')} · ${safe(r.video?.name||r.names?.[0]||r.sourceScript?.slice(0,22)||'手動數據')}</b><small>觀看 ${safe(r.metrics.views?.value??'未辨識')} · 分享率 ${safe(r.share)} · ${(r.feedback||[]).length} 項回饋</small></button><div class="buttonline"><button class="secondary" data-delete="${safe(r.id)}">刪除這筆</button></div></div>`).join('')||'<p class="small">還沒有紀錄。完成一次分析後會出現在這裡。</p>'}catch(e){$('history').textContent='無法讀取本機紀錄'}}
$('history').onclick=async e=>{const del=e.target.closest('[data-delete]')?.dataset.delete;if(del){if(confirm('刪除這筆分析紀錄？')){await store('records','readwrite',s=>s.delete(del));await renderHistory()}return}const id=e.target.closest('[data-id]')?.dataset.id;if(!id)return;const db=await dbPromise;const r=await new Promise(resolve=>{const q=db.transaction('records').objectStore('records').get(id);q.onsuccess=()=>resolve(q.result)});if(r){switchView('New');renderResult(r);$('save').textContent='已儲存'}};
$('export').onclick=async()=>{try{const payload={schema:1,exportedAt:new Date().toISOString(),records:await allRecords(),profile:{prefs,rejects}},blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='影像拆解室-備份-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}catch(e){alert('備份失敗，請重試')}};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(data.schema!==1||!Array.isArray(data.records)||data.records.some(r=>!r.id||!r.createdAt||!r.metrics))throw Error('格式不正確');for(const r of data.records)await store('records','readwrite',s=>s.put(r));if(data.profile?.prefs){prefs={...prefs,...data.profile.prefs};rejects=data.profile.rejects||rejects;await saveSettings();renderRules()}await renderHistory();alert(`已匯入 ${data.records.length} 筆紀錄`)}catch(err){alert('備份檔無法匯入：'+err.message)}e.target.value=''};
(async()=>{try{const saved=await getSetting('profile');if(saved){prefs={...prefs,...saved.prefs};rejects=saved.rejects||{}}if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});renderRules()}catch(e){status('本機儲存不可用；仍可分析並複製建議。')}})();
