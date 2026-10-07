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
 if(prefs.hook)advice.push(['0–3 秒｜檢查原稿開頭',`你的第一句是「${excerpt(first)}」。${/^(大家好|嗨|哈囉|今天要|我是)/.test(first)?'先移掉招呼與自我介紹，直接講觀眾的問題。':'確認這一句在 3 秒內能說完，並讓觀眾知道為何要繼續看。'}`]);
 if(prefs.story)advice.push(['中段｜真實片段',story?`原稿有「${excerpt(story)}」。檢查它是否交代當時的具體場景與你的反應。`:'原稿未找到明確的個人經歷句；選一件你真的遇過的事，補上時間、場景與當時反應。']);
 if(prefs.turn)advice.push(['轉折｜觀點變化',turn?`原稿的轉折是「${excerpt(turn)}」。把「後來發現」後面最不直覺的觀察講清楚。`:'原稿未找到明顯轉折；可檢查是否有「原本以為…後來發現…」的具體觀察。']);
 if(prefs.action)advice.push(['方法｜可執行性',action?`原稿寫到「${excerpt(action)}」。讓觀眾知道第一步現在就能怎麼做。`:'原稿未找到清楚的方法句；保留 1 個可以立刻開始的動作，教學類可拆成 3 步。']);
 if(prefs.share)advice.push(['結尾｜分享理由',`最後一句是「${excerpt(last)}」。${/分享|轉給|傳給|留言|收藏/.test(last)?'檢查這句是否先給觀眾想分享的理由，再提出動作。':'想提高分享，可以點出「這句話適合傳給哪一種朋友」，避免只用泛泛的追蹤口號。'}`]);
 if(prefs.business)advice.push(['IP 與變現','檢查整篇是否讓觀眾知道你能解決哪一種問題，並自然接到你的內容、服務或產品。']);
 if(rejects['太空泛'])advice.push(['你曾回饋：太空泛','把抽象詞換成原稿裡真實發生的事或能拍到的動作；沒有素材的地方不編造。']);
 if(rejects['開頭太慢'])advice.unshift(['你曾回饋：開頭太慢','把背景資訊移到痛點之後，第一句直接進入事件。']);
 if(rejects['太雞湯']||rejects['不像我的口吻'])advice.push(['你的口吻','保留你原稿裡直接、有趣的說法，刪掉空泛的鼓勵句。']);
 if(rejects['缺真實故事'])advice.push(['你曾回饋：缺真實故事','用你親身經歷的一個場景承接觀點，不編造故事。']);
 if(rejects['沒有變現方向'])advice.push(['你曾回饋：沒有變現方向','在結尾自然說明你能幫哪一種人，不硬塞購買口號。']);
 if(rejects['CTA 太硬'])advice.push(['你曾回饋：CTA 太硬','先給值得傳給朋友的理由，再決定是否需要直接要求分享。']);
 const draft=[`【原稿開頭】\n${excerpt(first)}`,`【建議先改】\n${/^(大家好|嗨|哈囉|今天要|我是)/.test(first)?'刪去招呼，從原稿裡最具體的事件或問題開場。':'保留這句的核心意思，刪到 3 秒能講完；優先留下具體問題或反差。'}`,story?`【保留你的真實故事】\n${excerpt(story)}`:'【故事待補】\n填入你自己真正遇到的一個場景與反應。',turn?`【轉折原句】\n${excerpt(turn)}`:'【轉折待補】\n說出你原本的想法和後來改變的觀察。',action?`【方法原句】\n${excerpt(action)}`:'【方法待補】\n只留一個觀眾現在能做的動作。',`【原稿結尾】\n${excerpt(last)}`,`【下一版提醒】\n以上引用你的原稿並指出修改位置；未補的故事和觀點需要你確認，程式不會編造經歷。`].join('\n\n');
 return {advice,draft,opening:first}
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
 if(sourceScript.trim()){const insight=scriptInsight(sourceScript.trim());return {metrics:m,video,raw,flags,advice:insight.advice,script:insight.draft,share,save,repost,sourceScript:sourceScript.trim()}}
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
 return {metrics:m,video,raw,flags,advice,script,share,save,repost};
}
function renderResult(r){
 current=r;$('results').classList.add('show');
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
