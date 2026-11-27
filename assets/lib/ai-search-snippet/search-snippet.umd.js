(function(v,y){typeof exports=="object"&&typeof module<"u"?y(exports):typeof define=="function"&&define.amd?define(["exports"],y):(v=typeof globalThis<"u"?globalThis:v||self,y(v.SearchSnippet={}))})(this,(function(v){"use strict";var Be=Object.defineProperty;var qe=(v,y,g)=>y in v?Be(v,y,{enumerable:!0,configurable:!0,writable:!0,value:g}):v[y]=g;var o=(v,y,g)=>qe(v,typeof y!="symbol"?y+"":y,g);const y={loadingAriaLabel:"Loading",errorPrefix:"Error:",missingApiUrlError:"The api-url attribute is required. Please provide a valid API URL.",poweredBy:"Powered by",poweredByLinkLabel:"Cloudflare AI Search",placeholder:"Search...",searchButtonLabel:"Search",searchInputAriaLabel:"Search input",searchResultsAriaLabel:"Search results",emptyStateTitle:"Start Searching",emptyStateDescription:"Enter a query to search for results",modalEmptyStateDescription:"Start typing to search",noResultsTitle:"No Results Found",noResultsDescription:'No results found for "{query}"',modalNoResultsTitle:"No results found",modalNoResultsDescription:'No results for "{query}"',resultsCount:"Found {n} result",resultsCountPlural:"Found {n} results",resultsCountOverflow:"Showing {n} of {total} results",modalResultsCount:"{n} result",modalResultsCountPlural:"{n} results",modalResultsCountZero:"0 results",modalResultsCountError:"Error",seeMoreResults:"See more results",groupOther:"Other",favoriteResults:"Favorites",recentResults:"Recent",addFavorite:"Add to favorites",removeFavorite:"Remove from favorites",navigateHint:"Navigate",selectHint:"Select",closeHint:"Close",chatTitle:"Chat",chatPlaceholder:"Type a message...",chatInputAriaLabel:"Chat message input",sendButtonLabel:"Send",sendButtonAriaLabel:"Send message",chatEmptyTitle:"Start a Conversation",chatEmptyDescription:"Send a message to begin chatting",userAvatar:"U",assistantAvatar:"AI",unknownError:"Unknown error",openChatAriaLabel:"Open chat",clearHistoryAriaLabel:"Clear history",minimizeAriaLabel:"Minimize",closeAriaLabel:"Close",historyTitle:"History",newChatButton:"New Chat",clearChatButton:"Clear Chat",toggleSidebarTitle:"Toggle sidebar",deleteChatTitle:"Delete chat",noChatsYet:"No chats yet",yesterday:"Yesterday",justNow:"Just now",minuteAgo:"{n} minute ago",minutesAgo:"{n} minutes ago",hourAgo:"{n} hour ago",hoursAgo:"{n} hours ago",loadingMessages:["Searching...","Digging through results...","Scanning the knowledge base...","Finding the best matches...","Sifting through the data...","Almost there...","Looking far and wide...","Connecting the dots...","Rummaging through pages...","Hunting down answers..."]};function g(n){if(!n||typeof n!="object")return y;const i={...y};for(const e of Object.keys(n)){const t=n[e];if(t!=null){if(e==="loadingMessages"){Array.isArray(t)&&t.length>0&&(i.loadingMessages=t.filter(s=>typeof s=="string"),i.loadingMessages.length===0&&(i.loadingMessages=y.loadingMessages));continue}typeof t=="string"&&(i[e]=t)}}return i}function C(n,i={}){return n.replace(/\{(\w+)\}/g,(e,t)=>Object.hasOwn(i,t)?String(i[t]):e)}function T(n,i){if(!n)return null;try{const e=JSON.parse(n);if(e===null||typeof e!="object"||Array.isArray(e))throw new Error("translations must be a JSON object");return e}catch(e){return console.error(`${i}: invalid translations attribute`,e),null}}const B=2500;function N(n,i){let e;function t(...s){clearTimeout(e),e=setTimeout(()=>{n(...s)},i)}return t.cancel=()=>clearTimeout(e),t}function c(n){const i=document.createElement("div");return i.textContent=n,i.innerHTML}function U(n){try{return decodeURI(n)}catch{return n}}function D(n){return new DOMParser().parseFromString(n,"text/html").documentElement.textContent||""}function pe(n,i){const e=g(i),t=new Date(n),r=new Date().getTime()-t.getTime();if(r<6e4)return e.justNow;if(r<36e5){const a=Math.floor(r/6e4),l=a===1?e.minuteAgo:e.minutesAgo;return C(l,{n:a})}if(r<864e5){const a=Math.floor(r/36e5),l=a===1?e.hourAgo:e.hoursAgo;return C(l,{n:a})}return t.toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function P(n){return new Date(n).toLocaleDateString(void 0,{month:"short",day:"numeric"})}function _(n="id"){return`${n}-${Date.now()}-${Math.random().toString(36).substr(2,9)}`}function b(n,i){return n!==null?n:i}function w(n,i){return n===null?i:n==="true"||n===""}function S(n,i){if(n===null)return i;const e=Number.parseInt(n,10);return Number.isNaN(e)?i:e}function j(n){return typeof n!="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n)?"":`<span class="result-icon" part="result-icon result-icon-${n}" aria-hidden="true"></span>`}function F(n,i){if(!(n===null||n===""))try{const e=JSON.parse(n);if(e===null||typeof e!="object"||Array.isArray(e))throw new Error("chat-query-rewrite must be a JSON object");const t=e,s={};return typeof t.enabled=="boolean"&&(s.enabled=t.enabled),typeof t.model=="string"&&(s.model=t.model),typeof t.rewritePrompt=="string"&&(s.rewritePrompt=t.rewritePrompt),s}catch(e){console.error(`${i}: invalid chat-query-rewrite attribute`,e);return}}function x(n,i){return new CustomEvent(n,{detail:i,bubbles:!0,composed:!0,cancelable:!0})}function V(n,i,e="Other"){const t=new Map;for(const s of n){const r=s.metadata?.[i],a=r==null||String(r).trim()===""?e:String(r),l=t.get(a);l?l.push(s):t.set(a,[s])}return[...t].map(([s,r])=>({key:s,results:r}))}function K(n,i){let e=0;return n.map((t,s)=>`
        <div class="result-group" role="group" aria-labelledby="result-group-label-${s}">
          <div class="result-group-header" id="result-group-label-${s}" role="presentation">${c(t.key)}</div>
          ${t.results.map(r=>i(r,e++)).join("")}
        </div>
      `).join("")}function A(n){if(!n)throw new Error("API URL is required");return new G(n)}const ue="@cf/meta/llama-3.3-70b-instruct-fp8-fast",ge=`You rewrite a multi-turn chat into a single standalone search query for a retrieval system.

Inputs: the full conversation in \`messages\`. The final user message is the one to answer; earlier messages are context only.

Rules:
- Output ONLY the rewritten query as plain text. No preamble, no quotes, no markdown, no explanation.
- Resolve pronouns and references (it, that, they, the second one, the previous one, etc.) using prior turns.
- Inline any entities, names, versions, products, or constraints from earlier turns that the final message depends on.
- Preserve the user's original language and terminology. Do not translate.
- Do not invent facts, sources, dates, or details not present in the conversation.
- If the final user message is already fully self-contained, return it unchanged (modulo trivial cleanup).
- Drop greetings, thanks, and meta questions about the assistant itself; keep only the information need.
- Keep it concise — a search query, not a sentence. Aim for under 200 characters when possible.

Return only the rewritten query.`;function me(n){let i="message";const e=[];for(const t of n.split(`
`)){const s=t.endsWith("\r")?t.slice(0,-1):t;if(s===""||s.startsWith(":"))continue;const r=s.indexOf(":"),a=r===-1?s:s.slice(0,r);let l=r===-1?"":s.slice(r+1);l.startsWith(" ")&&(l=l.slice(1)),a==="event"?i=l:a==="data"&&e.push(l)}return e.length===0?null:{event:i,data:e.join(`
`)}}function E(n){return n!==null&&typeof n=="object"&&!Array.isArray(n)}function Q(...n){const i={};for(const e of n)if(e)for(const[t,s]of Object.entries(e)){const r=i[t];E(r)&&E(s)?i[t]=Q(r,s):i[t]=s}return i}function ve(n,i){if(!E(i))return n;const e=new URLSearchParams;for(const[h,d]of Object.entries(i))d!=null&&e.append(h,String(d));const t=e.toString();if(!t)return n;const s=n.indexOf("#"),r=s===-1?n:n.slice(0,s),a=s===-1?"":n.slice(s),l=r.includes("?")?"&":"?";return`${r}${l}${t}${a}`}function fe(n){if(!E(n))return{};const i={};for(const[e,t]of Object.entries(n))t!=null&&(i[e]=String(t));return i}function be(n){return E(n)?n:void 0}class G{constructor(i){o(this,"activeRequests",new Map);o(this,"baseUrl");this.baseUrl=i.replace(/\/$/,"")}request(i,e,t,s){const r=e==="search"?"snippet-search":"snippet-chat-completions",a=ve(`${this.baseUrl}/${e}`,s?.queryParams);return fetch(a,{method:"POST",body:JSON.stringify(Q(be(s?.body),i)),headers:{...fe(s?.headers),"Content-Type":"application/json",Accept:i.stream?"text/event-stream":"application/json","cf-ai-search-source":r},signal:t})}async search(i,e={}){const t=this.generateRequestId(),s=new AbortController,r=e.signal||s.signal;this.registerRequest(t,s);try{const a=await this.request({messages:[{role:"user",content:i}],stream:!1,ai_search_options:{retrieval:{metadata_only:!0,max_num_results:e.maxResults??30}}},"search",r,e.request);if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);if(!a.body)throw new Error("Response body is empty");const l=await a.json();if(l.success&&l.result)return l.result.chunks.map(h=>({type:"result",id:h.id,title:D(h.item.metadata?.title),description:h.item.metadata?.description?D(h.item.metadata?.description):"",timestamp:h.item.timestamp??void 0,url:h.item.key,image:h.item.metadata?.image||void 0,metadata:{...h.item.metadata,instance_id:h.instance_id}}));throw l.success===!1?new Error(l.error):new Error("Unknown error")}finally{this.unregisterRequest(t)}}async*searchStream(i,e={}){const t=this.generateRequestId(),s=new AbortController,r=e.signal||s.signal;this.registerRequest(t,s);const a=await this.request({messages:[{role:"user",content:i}],stream:!0,...e.maxResults!==void 0&&{max_num_results:e.maxResults}},"ai-search",r,e.request);if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);if(!a.body)throw new Error("Response body is empty");let l="";const h=a.body.getReader(),d=new TextDecoder;for(;;){const{done:p,value:m}=await h.read();if(p)break;const f=d.decode(m,{stream:!0});l+=f}yield{type:"result",id:"",title:"",description:l.replaceAll("data: ","").trim().split(`

`).map(p=>JSON.parse(p)).map(p=>p.response).join(""),url:"",metadata:{}}}async*chat(i,e){const t=new AbortController,s=e?.signal||t.signal,r=e?.stream??!0,l={messages:[...e?.history??[],{role:"user",content:i}],stream:r};if(e?.queryRewrite){const d=typeof e.queryRewrite=="object"?e.queryRewrite:{};l.ai_search_options={query_rewrite:{enabled:!0,model:d.model??ue,rewrite_prompt:d.rewritePrompt??ge}}}const h=await this.request(l,"chat/completions",s);if(!h.ok)throw new Error(`HTTP error! status: ${h.status}`);if(!h.body)throw new Error("Response body is empty");if(!r){yield{type:"text",message:(await h.json()).choices.map(u=>u.message.content).join("")};return}yield*this.parseChatStream(h.body)}async*parseChatStream(i){const e=i.getReader(),t=new TextDecoder;let s="";const r=a=>{const l=me(a);if(!l||l.event==="chunks")return null;if(l.data==="[DONE]")return"done";try{const d=JSON.parse(l.data).choices?.[0]?.delta?.content;if(typeof d=="string"&&d.length>0)return{type:"text",message:d}}catch(h){console.error("AISearchClient: failed to parse SSE chat chunk",h)}return null};try{for(;;){const{done:a,value:l}=await e.read();if(a)break;s+=t.decode(l,{stream:!0});let h=s.indexOf(`

`);for(;h!==-1;){const d=s.slice(0,h);s=s.slice(h+2);const u=r(d);if(u==="done")return;u&&(yield u),h=s.indexOf(`

`)}}if(s+=t.decode(),s.trim().length>0){const a=r(s);a&&a!=="done"&&(yield a)}}catch(a){if(a.name==="AbortError")return;throw a}finally{e.releaseLock()}}cancelRequest(i){const e=this.activeRequests.get(i);e&&(e.controller.abort(),this.unregisterRequest(i))}cancelAllRequests(){for(const[i]of this.activeRequests)this.cancelRequest(i)}registerRequest(i,e){this.activeRequests.set(i,{id:i,controller:e,timestamp:Date.now()})}unregisterRequest(i){this.activeRequests.delete(i)}generateRequestId(){return`req-${Date.now()}-${Math.random().toString(36).substr(2,9)}`}}const ye="0.0.43",R=`Powered by <a href="https://workers.cloudflare.com/product/ai-search" target="_blank" rel="noopener noreferrer">Cloudflare AI Search <svg width="32" height="10" viewBox="0 0 412 186" xmlns="http://www.w3.org/2000/svg" aria-label="Cloudflare" role="img">
  <path fill="#f38020" d="m280.8395,183.31456c11,-26 -4,-38 -19,-38l-148,-2c-4,0 -4,-6 1,-7l150,-2c17,-1 37,-15 43,-33c0,0 10,-21 9,-24a97,97 0 0 0 -187,-11c-38,-25 -78,9 -69,46c-48,3 -65,46 -60,72c0,1 1,2 3,2l274,0c1,0 3,-1 3,-3z"/>
  <path fill="#faae40" d="m330.8395,81.31456c-4,0 -6,-1 -7,1l-5,21c-5,16 3,30 20,31l32,2c4,0 4,6 -1,7l-33,1c-36,4 -46,39 -46,39c0,2 0,3 2,3l113,0l3,-2a81,81 0 0 0 -78,-103"/>
</svg></a>`,we=2e4,xe=20,Ce="/stats";function Y(){return typeof document<"u"&&typeof window<"u"}class q{constructor(i,e={}){o(this,"baseUrl");o(this,"endpoint");o(this,"snippetVersion");o(this,"flushIntervalMs");o(this,"maxBufferSize");o(this,"buffer",[]);o(this,"flushTimer",null);o(this,"destroyed",!1);o(this,"boundUnloadHandler");o(this,"boundVisibilityHandler");this.baseUrl=i.replace(/\/$/,""),this.endpoint=e.endpoint??Ce,this.snippetVersion=e.snippetVersion??ye,this.flushIntervalMs=e.flushIntervalMs??we,this.maxBufferSize=Math.max(1,e.maxBufferSize??xe),this.boundUnloadHandler=()=>this.flushBeacon(),this.boundVisibilityHandler=()=>{typeof document<"u"&&document.visibilityState==="hidden"&&this.flushBeacon()},Y()&&(window.addEventListener("pagehide",this.boundUnloadHandler),document.addEventListener("visibilitychange",this.boundVisibilityHandler))}trackSearch(i,e){this.track({inputQuery:i,snippetVersion:this.snippetVersion,totalResult:e})}trackClick(i,e,t,s){this.track({inputQuery:i,snippetVersion:this.snippetVersion,totalResult:e,clickedResultId:t,clickPosition:s,clickViewMore:!1})}trackViewMore(i,e){this.track({inputQuery:i,snippetVersion:this.snippetVersion,totalResult:e,clickViewMore:!0})}track(i){if(!this.destroyed){if(this.buffer.push(i),this.buffer.length>=this.maxBufferSize){this.flush();return}this.scheduleFlush()}}flush(){const i=this.drainBuffer();if(i.length===0)return;const e=JSON.stringify({events:i});fetch(this.buildUrl(),{method:"POST",headers:{"Content-Type":"application/json"},body:e,keepalive:!0}).catch(t=>{console.log(t)})}flushBeacon(){const i=this.drainBuffer();if(i.length===0)return;const e=JSON.stringify({events:i}),t=this.buildUrl();if(typeof navigator<"u"&&typeof navigator.sendBeacon=="function")try{const s=new Blob([e],{type:"application/json"});if(navigator.sendBeacon(t,s))return}catch{}typeof fetch<"u"&&fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:e,keepalive:!0}).catch(()=>{})}destroy(){this.destroyed||(this.destroyed=!0,this.flushTimer!==null&&(clearTimeout(this.flushTimer),this.flushTimer=null),Y()&&(window.removeEventListener("pagehide",this.boundUnloadHandler),document.removeEventListener("visibilitychange",this.boundVisibilityHandler)),this.flushBeacon())}scheduleFlush(){this.flushTimer!==null||this.destroyed||(this.flushTimer=setTimeout(()=>{this.flushTimer=null,this.flush()},this.flushIntervalMs))}drainBuffer(){if(this.flushTimer!==null&&(clearTimeout(this.flushTimer),this.flushTimer=null),this.buffer.length===0)return[];const i=this.buffer;return this.buffer=[],i}buildUrl(){const i=this.endpoint.startsWith("/")?this.endpoint:`/${this.endpoint}`;return`${this.baseUrl}${i}`}}const J=`
/* Chat container */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

/* Messages area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--search-snippet-spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-md);
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: var(--search-snippet-surface);
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--search-snippet-text-secondary);
}

/* Message */
.chat-message {
  display: flex;
  gap: var(--search-snippet-spacing-sm);
  max-width: 85%;
  animation: slideIn var(--search-snippet-animation-duration) ease-out;
  animation-fill-mode: both;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-message-assistant {
  align-self: flex-start;
}

.chat-message-system {
  align-self: center;
  max-width: 100%;
}

/* Message avatar */
.chat-message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: var(--search-snippet-font-size-sm);
  font-weight: var(--search-snippet-font-weight-bold);
  background: var(--search-snippet-primary-color);
  color: white;
}

.chat-message-assistant .chat-message-avatar {
  background: var(--search-snippet-surface);
  color: var(--search-snippet-text-color);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
}

/* Message content */
.chat-message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-xs);
  max-width: 100%;
}

.chat-message-content ol, .chat-message-content ul {
  margin-inline-start: 16px;
}

.chat-message-content ol li, .chat-message-content ul li {
  padding-inline-start: 0;
}

.chat-message-bubble {
  padding: var(--search-snippet-spacing-sm) var(--search-snippet-spacing-md);
  border-radius: var(--search-snippet-border-radius);
  word-wrap: break-word;
  overflow-wrap: break-word;
  /* Isolate layout cost of bubble height changes during streaming so
     siblings don't reflow. */
  contain: layout style;
}

.chat-message-user .chat-message-bubble {
  background: var(--search-snippet-user-message-bg);
  color: var(--search-snippet-user-message-text);
  border-top-right-radius: var(--search-snippet-spacing-xs);
}

.chat-message-assistant .chat-message-bubble {
  background: var(--search-snippet-assistant-message-bg);
  color: var(--search-snippet-assistant-message-text);
  border-top-left-radius: var(--search-snippet-spacing-xs);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
}

.chat-message-system .chat-message-bubble {
  background: var(--search-snippet-system-message-bg);
  color: var(--search-snippet-system-message-text);
  text-align: center;
  font-size: var(--search-snippet-font-size-sm);
  padding: var(--search-snippet-spacing-xs) var(--search-snippet-spacing-md);
}

.chat-message-text {
  font-size: var(--search-snippet-font-size-base);
  line-height: 1.5;
  white-space: wrap;
}
.chat-message-text li{
  padding-inline-start: var(--search-snippet-spacing-md);
}

.chat-message-metadata {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-sm);
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
}

.chat-message-user .chat-message-metadata {
  justify-content: flex-end;
}

.chat-message-time {
  opacity: 0.7;
}

/* Streaming indicator */
.chat-streaming {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-xs);
}

.chat-streaming-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.4s ease-in-out infinite;
}

.chat-streaming-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-streaming-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.chat-streaming .loading-text {
  margin-left: var(--search-snippet-spacing-xs);
}

/* Input area */
.chat-input-area {
  padding: var(--search-snippet-spacing-md);
  border-top: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  background: var(--search-snippet-surface);
}

.chat-input-wrapper {
  display: flex;
  gap: var(--search-snippet-spacing-sm);
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  min-height: var(--search-snippet-input-height);
  max-height: 120px;
  padding: var(--search-snippet-spacing-sm) var(--search-snippet-spacing-md);
  font-family: var(--search-snippet-font-family);
  font-size: var(--search-snippet-font-size-base);
  line-height: var(--search-snippet-line-height);
  color: var(--search-snippet-text-color);
  background: var(--search-snippet-background);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
  outline: none;
  resize: vertical;
  transition: var(--search-snippet-transition);
}

.chat-input:focus {
  border-color: var(--search-snippet-primary-color);
  box-shadow: 0 0 0 3px var(--search-snippet-focus-ring);
}

.chat-input::placeholder {
  color: var(--search-snippet-text-secondary);
}

.chat-input:disabled {
  background: var(--search-snippet-surface);
  cursor: not-allowed;
  opacity: 0.6;
}

.chat-send-button {
  flex-shrink: 0;
  height: var(--search-snippet-input-height);
  padding: 0 var(--search-snippet-spacing-lg);
}

.chat-send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Empty chat state */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--search-snippet-spacing-xxl);
  gap: var(--search-snippet-spacing-md);
  color: var(--search-snippet-text-secondary);
  text-align: center;
  height: 100%;
}

.chat-empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.chat-empty-title {
  font-size: var(--search-snippet-font-size-lg);
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-color);
}

.chat-empty-description {
  font-size: var(--search-snippet-font-size-sm);
}

/* Code blocks in messages */
.chat-message-bubble pre {
  background: var(--search-snippet-surface);
  padding: var(--search-snippet-spacing-sm);
  border-radius: var(--search-snippet-border-radius);
  overflow-x: auto;
  font-family: var(--search-snippet-font-family-mono);
  font-size: var(--search-snippet-font-size-sm);
  margin: var(--search-snippet-spacing-xs) 0;
}

.chat-message-bubble code {
  font-family: var(--search-snippet-font-family-mono);
  font-size: 0.9em;
  background: var(--search-snippet-surface);
  padding: 2px 4px;
  border-radius: var(--search-snippet-border-radius);
}

.chat-message-bubble pre code {
  background: none;
  padding: 0;
}

/* Links in messages */
.chat-message-bubble a {
  color: var(--search-snippet-primary-color);
  text-decoration: underline;
}

.chat-message-bubble a:hover {
  text-decoration: none;
}
`,I=`
:host {
  /* Colors - Light Mode */
  --search-snippet-primary-color: #2563eb;
  --search-snippet-primary-hover: #0f51dfff;
  --search-snippet-background: #ffffff;
  --search-snippet-surface: #f8f9fa;
  --search-snippet-text-color: #212529;
  --search-snippet-text-secondary: #6c757d;
  --search-snippet-text-description: #495057;
  --search-snippet-border-color: #dee2e6;
  --search-snippet-hover-background: #f1f3f5;
  --search-snippet-focus-ring: #0066cc40;
  --search-snippet-error-color: #dc3545;
  --search-snippet-error-background: #f8d7da;
  --search-snippet-success-color: #28a745;
  --search-snippet-success-background: #d4edda;
  --search-snippet-warning-color: #ffc107;
  --search-snippet-warning-background: #fff3cd;
  
  /* Message Colors */
  --search-snippet-user-message-bg: #0066cc;
  --search-snippet-user-message-text: #ffffff;
  --search-snippet-assistant-message-bg: #f1f3f5;
  --search-snippet-assistant-message-text: #212529;
  --search-snippet-system-message-bg: #fff3cd;
  --search-snippet-system-message-text: #856404;
  
  /* Typography */
  --search-snippet-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                                'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 
                                'Segoe UI Emoji', 'Segoe UI Symbol';
  --search-snippet-font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  --search-snippet-font-size-base: 14px;
  --search-snippet-font-size-sm: 12px;
  --search-snippet-font-size-lg: 16px;
  --search-snippet-font-size-xl: 18px;
  --search-snippet-line-height: 1.5;
  --search-snippet-font-weight-normal: 400;
  --search-snippet-font-weight-medium: 500;
  --search-snippet-font-weight-bold: 600;
  
  /* Spacing */
  --search-snippet-spacing-xs: 4px;
  --search-snippet-spacing-sm: 8px;
  --search-snippet-spacing-md: 12px;
  --search-snippet-spacing-lg: 16px;
  --search-snippet-spacing-xl: 24px;
  --search-snippet-spacing-xxl: 32px;
  
  /* Sizing */
  --search-snippet-width: 100%;
  --search-snippet-max-width: 100%;
  --search-snippet-min-width: 320px;
  --search-snippet-max-height: 600px;
  --search-snippet-input-height: 44px;
  --search-snippet-button-height: 36px;
  --search-snippet-icon-size: 20px;
  
  /* Border */
  --search-snippet-border-width: 1px;
  --search-snippet-border-radius: 18px;
  
  /* Shadows */
  --search-snippet-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --search-snippet-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --search-snippet-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --search-snippet-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
  --search-snippet-shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  
  /* Animation */
  --search-snippet-transition-fast: 150ms ease;
  --search-snippet-transition: 200ms ease;
  --search-snippet-transition-slow: 300ms ease;
  --search-snippet-animation-duration: 0.2s;
  
  /* Z-index */
  --search-snippet-z-dropdown: 1000;
  --search-snippet-z-modal: 1050;
  --search-snippet-z-popover: 1060;
  --search-snippet-z-tooltip: 1070;
  
  /* Layout */
  display: block;
  width: var(--search-snippet-width);
  max-width: var(--search-snippet-max-width);
  min-width: var(--search-snippet-min-width);
  font-family: var(--search-snippet-font-family);
  font-size: var(--search-snippet-font-size-base);
  line-height: var(--search-snippet-line-height);
  color: var(--search-snippet-text-color);


  /* Search */
  --search-snippet-icon-size: 20px;
  --search-snippet-icon-margin-left: 6px;
  --search-snippet-result-icon-size: 20px;
  --search-snippet-result-icon-color: var(--search-snippet-text-secondary);
  --search-snippet-result-icon-active-color: var(--search-snippet-primary-color);
  --search-snippet-result-item-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

  /* Chat Bubble */
  --chat-bubble-button-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  --chat-bubble-window-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  --chat-bubble-button-size: 60px;
  --chat-bubble-button-radius: 50%;
  --chat-bubble-button-icon-size: 28px;
  --chat-bubble-button-icon-color: white;
  --chat-bubble-button-bottom: 20px;
  --chat-bubble-button-right: 20px;
  --chat-bubble-button-z-index: 9999;
  --chat-bubble-position: fixed;


}

:host(:not([theme="dark"])) {
  /* Colors - Light Mode */
  --search-snippet-primary-color: #2563eb;
  --search-snippet-primary-hover: #0f51dfff;
  --search-snippet-background: #ffffff;
  --search-snippet-surface: #f8f9fa;
  --search-snippet-text-color: #212529;
  --search-snippet-text-secondary: #6c757d;
  --search-snippet-text-description: #495057;
  --search-snippet-border-color: #dee2e6;
  --search-snippet-hover-background: #f1f3f5;
  --search-snippet-focus-ring: #0066cc40;
  --search-snippet-error-color: #dc3545;
  --search-snippet-error-background: #f8d7da;
  --search-snippet-success-color: #28a745;
  --search-snippet-success-background: #d4edda;
  --search-snippet-warning-color: #ffc107;
  --search-snippet-warning-background: #fff3cd;
  
  /* Message Colors */
  --search-snippet-user-message-bg: #0066cc;
  --search-snippet-user-message-text: #ffffff;
  --search-snippet-assistant-message-bg: #f1f3f5;
  --search-snippet-assistant-message-text: #212529;
  --search-snippet-system-message-bg: #fff3cd;
  --search-snippet-system-message-text: #856404;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --search-snippet-primary-color: #2563eb;
    --search-snippet-primary-hover: #0f51dfff;
    --search-snippet-background: #1a1b1e;
    --search-snippet-surface: #25262b;
    --search-snippet-text-color: #c1c2c5;
    --search-snippet-text-secondary: #909296;
    --search-snippet-text-description: #adb5bd;
    --search-snippet-border-color: #373a40;
    --search-snippet-hover-background: #2c2e33;
    --search-snippet-focus-ring: #4dabf740;
    --search-snippet-error-color: #ff6b6b;
    --search-snippet-error-background: #3d1f1f;
    --search-snippet-success-color: #51cf66;
    --search-snippet-success-background: #1f3d24;
    --search-snippet-warning-color: #ffd43b;
    --search-snippet-warning-background: #3d3419;
    
    --search-snippet-user-message-bg: #4dabf7;
    --search-snippet-user-message-text: #1a1b1e;
    --search-snippet-assistant-message-bg: #2c2e33;
    --search-snippet-assistant-message-text: #c1c2c5;
    --search-snippet-system-message-bg: #3d3419;
    --search-snippet-system-message-text: #ffd43b;
    color-scheme: dark;
  }
}

/* Auto theme support */
:host([theme="light"]) {
  color-scheme: light;
}


/* Base reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Metadata-driven result icons are hidden until an external ::part() rule displays them. */
.result-icon {
  display: none;
  flex: 0 0 var(--search-snippet-result-icon-size);
  width: var(--search-snippet-result-icon-size);
  height: var(--search-snippet-result-icon-size);
  color: var(--search-snippet-result-icon-color);
}

a:hover > .result-icon,
a:focus-visible > .result-icon,
a.active > .result-icon {
  color: var(--search-snippet-result-icon-active-color);
}

/* Container */
.container {
  background: var(--search-snippet-background);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
  box-shadow: var(--search-snippet-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  padding: var(--search-snippet-spacing-md);
  border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  background: var(--search-snippet-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--search-snippet-spacing-md);
}

.header-title {
  font-size: var(--search-snippet-font-size-lg);
  font-weight: var(--search-snippet-font-weight-bold);
  color: var(--search-snippet-text-color);
}

/* Input */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-sm);
}

.input {
  width: 100%;
  height: var(--search-snippet-input-height);
  padding: var(--search-snippet-spacing-sm) var(--search-snippet-spacing-md);
  font-family: var(--search-snippet-font-family);
  font-size: var(--search-snippet-font-size-base);
  line-height: var(--search-snippet-line-height);
  color: var(--search-snippet-text-color);
  background: var(--search-snippet-background);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
  outline: none;
  transition: var(--search-snippet-transition);
}

.input:focus {
  border-color: var(--search-snippet-primary-color);
  box-shadow: 0 0 0 3px var(--search-snippet-focus-ring);
}

.input::placeholder {
  color: var(--search-snippet-text-secondary);
}

.input:disabled {
  background: var(--search-snippet-surface);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Button */
.button {
  height: var(--search-snippet-button-height);
  padding: 0 var(--search-snippet-spacing-lg);
  font-family: var(--search-snippet-font-family);
  font-size: var(--search-snippet-font-size-base);
  font-weight: var(--search-snippet-font-weight-medium);
  color: #ffffff;
  background: var(--search-snippet-primary-color);
  border: none;
  border-radius: var(--search-snippet-border-radius);
  cursor: pointer;
  outline: none;
  transition: var(--search-snippet-transition);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--search-snippet-spacing-sm);
  white-space: nowrap;
}

.button:hover:not(:disabled) {
  background: var(--search-snippet-primary-hover);
}

.button:focus-visible {
  box-shadow: 0 0 0 3px var(--search-snippet-focus-ring);
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-secondary {
  background: var(--search-snippet-surface);
  color: var(--search-snippet-text-color);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
}

.button-secondary:hover:not(:disabled) {
  background: var(--search-snippet-hover-background);
}

/* Content area */
.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--search-snippet-spacing-md);
}

/* Scrollbar styling */
.content::-webkit-scrollbar {
  width: 8px;
}

.content::-webkit-scrollbar-track {
  background: var(--search-snippet-surface);
}

.content::-webkit-scrollbar-thumb {
  background: var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
}

.content::-webkit-scrollbar-thumb:hover {
  background: var(--search-snippet-text-secondary);
}

/* Loading spinner */
.loading {
  display: inline-block;
  width: var(--search-snippet-icon-size);
  height: var(--search-snippet-icon-size);
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Loading message animation */
@keyframes loading-message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-text {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
}

.loading-text-animate {
  animation: loading-message-in 0.3s ease-out;
}

/* Error message */
.error {
  padding: var(--search-snippet-spacing-md);
  color: var(--search-snippet-error-color);
  background: var(--search-snippet-error-background);
  border-radius: var(--search-snippet-border-radius);
  font-size: var(--search-snippet-font-size-sm);
}

/* Empty state */
.empty {
  padding: var(--search-snippet-spacing-xl);
  text-align: center;
  color: var(--search-snippet-text-secondary);
}

/* Accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible polyfill */
.focus-visible:focus {
  outline: 2px solid var(--search-snippet-primary-color);
  outline-offset: 2px;
}

/* Powered by branding - block style (for sidebars) */
.powered-by {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--search-snippet-spacing-xs);
  padding: var(--search-snippet-spacing-sm) var(--search-snippet-spacing-md);
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
  background: var(--search-snippet-surface);
  border-top: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  margin-top: auto;
  flex-shrink: 0;
}

.powered-by svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.powered-by a,
.powered-by-inline a {
  color: var(--search-snippet-text-secondary);
  text-decoration: none;
  transition: color var(--search-snippet-transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.powered-by a:hover,
.powered-by-inline a:hover {
  color: var(--search-snippet-primary-color);
}

/* Powered by branding - inline style (for headers/subtle placement) */
.powered-by-inline {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
  padding: var(--search-snippet-spacing-xs) 0;
  text-align: center;
}
`,Se=/^[a-z][a-z0-9+.-]*:/i,ke=new Set(["http:","https:","mailto:","tel:"]);function z(n){if(typeof n!="string")return"";const i=n.replace(/^[\s\u0000-\u001f\u007f]+|[\s\u0000-\u001f\u007f]+$/g,"");if(i==="")return"";if(!Se.test(i))return i;let e;try{e=new URL(i)}catch{return""}return ke.has(e.protocol)?i:""}function Ee(n){let i=n;i=Me(i),i=i.replace(/```([\s\S]*?)```/g,(a,l)=>`<pre><code>${l.trim()}</code></pre>`);const e=i.split(`
`),t=[];let s=!1,r="";for(let a=0;a<e.length;a++){const l=e[a],h=l.match(/^(#{1,6})\s+(.+)$/);if(h){const p=h[1].length,m=h[2];t.push(`<h${p}>${M(m)}</h${p}>`);continue}if(l.match(/^---+$/)){t.push("<hr />");continue}if(l.match(/^>\s+/)){const p=l.replace(/^>\s+/,"");t.push(`<blockquote>${M(p)}</blockquote>`);continue}const d=l.match(/^[-*]\s+(.+)$/);if(d){(!s||r!=="ul")&&(s&&t.push(`</${r}>`),t.push("<ul>"),s=!0,r="ul"),t.push(`<li>${M(d[1])}</li>`);continue}const u=l.match(/^\d+\.\s+(.+)$/);if(u){(!s||r!=="ol")&&(s&&t.push(`</${r}>`),t.push("<ol>"),s=!0,r="ol"),t.push(`<li>${M(u[1])}</li>`);continue}if(s&&(t.push(`</${r}>`),s=!1,r=""),l.trim()===""){t.push("<br />");continue}t.push(`<p>${M(l)}</p>`)}return s&&t.push(`</${r}>`),t.join(`
`)}function M(n){let i=n;return i=i.replace(/`([^`]+)`/g,"<code>$1</code>"),i=i.replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>"),i=i.replace(/___(.+?)___/g,"<strong><em>$1</em></strong>"),i=i.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),i=i.replace(/__(.+?)__/g,"<strong>$1</strong>"),i=i.replace(/\*(.+?)\*/g,"<em>$1</em>"),i=i.replace(/_(.+?)_/g,"<em>$1</em>"),i=i.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(e,t,s)=>{const r=z(s);return r?`<a href="${r}" target="_blank" rel="noopener noreferrer">${t}</a>`:t}),i}function Me(n){const i={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};return n.replace(/[&<>"']/g,e=>i[e]||e)}const Le=64;class W{constructor(i,e,t){o(this,"container");o(this,"client");o(this,"props");o(this,"translations");o(this,"inputElement",null);o(this,"messagesContainer",null);o(this,"sendButton",null);o(this,"messages",[]);o(this,"isStreaming",!1);o(this,"currentStreamingMessageId",null);o(this,"currentChatAbortController",null);o(this,"loadingMessageInterval",null);o(this,"loadingMessageIndex",0);o(this,"pendingScrollFrame",null);o(this,"handleInputResize",null);o(this,"handleInputKeydown",null);o(this,"handleSendClick",null);this.container=i,this.client=e,this.props=t,this.translations=g(t.translations),this.render(),this.attachEventListeners()}render(){const i=this.translations;this.container.innerHTML=`
      <div class="chat-container">
        <div class="chat-messages">
          ${this.renderEmptyStateHTML()}
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea
              class="chat-input"
              placeholder="${c(this.props.placeholder||i.chatPlaceholder)}"
              aria-label="${c(i.chatInputAriaLabel)}"
              style="height: 40px;"
              rows="1"
            ></textarea>
            <button class="button chat-send-button" aria-label="${c(i.sendButtonAriaLabel)}">
              <span>${c(i.sendButtonLabel)}</span>
            </button>
          </div>
        </div>
      </div>
    `,this.messagesContainer=this.container.querySelector(".chat-messages"),this.inputElement=this.container.querySelector(".chat-input"),this.sendButton=this.container.querySelector(".chat-send-button")}renderEmptyStateHTML(){const i=this.translations;return`
      <div class="chat-empty">
        <svg class="chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <div class="chat-empty-title">${c(i.chatEmptyTitle)}</div>
        <div class="chat-empty-description">
          ${c(i.chatEmptyDescription)}
        </div>
      </div>
    `}attachEventListeners(){!this.inputElement||!this.sendButton||(this.handleInputResize=i=>{const e=i.target;e.style.height="auto",e.style.height=`${e.scrollHeight}px`},this.inputElement.addEventListener("input",this.handleInputResize),this.handleInputKeydown=i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),this.handleSendMessage())},this.inputElement.addEventListener("keydown",this.handleInputKeydown),this.handleSendClick=()=>{this.handleSendMessage()},this.sendButton.addEventListener("click",this.handleSendClick))}async handleSendMessage(){if(!this.inputElement||this.isStreaming)return;const i=this.inputElement.value.trim();i.length!==0&&(this.inputElement.value="",this.inputElement.style.height="auto",await this.sendMessage(i))}async sendMessage(i){const e=this.messages.map(h=>({role:h.role,content:h.content})),t=this.resolveQueryRewriteOption(e),s={id:_("msg"),role:"user",content:i,timestamp:Date.now()};this.addMessage(s),this.renderMessages(!0),this.setStreamingState(!0);const r=_("msg"),a={id:r,role:"assistant",content:"",timestamp:Date.now()};this.addMessage(a),this.currentStreamingMessageId=r,this.renderMessages(!0);const l=new AbortController;this.currentChatAbortController=l;try{const h=this.client.chat(i,{history:e,queryRewrite:t,signal:l.signal});let d="";for await(const p of h)if(p.type==="text"&&p.message)d+=p.message,this.updateStreamingMessage(r,d);else if(p.type==="error"){this.showErrorInMessage(r,p.message||this.translations.unknownError);break}const u=this.messages.findIndex(p=>p.id===r);u!==-1&&(this.messages[u].content=d),this.container.dispatchEvent(x("message",{message:a}))}catch(h){this.showErrorInMessage(r,h.message),this.container.dispatchEvent(x("error",{error:{message:h.message,code:"CHAT_ERROR"}}))}finally{this.currentChatAbortController===l&&(this.currentChatAbortController=null),this.setStreamingState(!1),this.renderMessages(),this.currentStreamingMessageId=null}}resolveQueryRewriteOption(i){const e=this.props.chatQueryRewrite;return e?.enabled===!1||i.length===0?!1:e&&(e.model!==void 0||e.rewritePrompt!==void 0)?{model:e.model,rewritePrompt:e.rewritePrompt}:!0}addMessage(i){this.messages.push(i),this.renderMessages()}updateStreamingMessage(i,e){const t=this.messages.findIndex(s=>s.id===i);t!==-1&&(this.messages[t].content=e,this.updateStreamingMessageDOM(i,e)||this.renderMessages(!0))}updateStreamingMessageDOM(i,e){if(!this.messagesContainer)return!1;const t=this.messagesContainer.querySelector(`[data-message-id="${CSS.escape(i)}"]`);if(!t)return!1;const s=t.querySelector(".chat-message-bubble");if(!s)return!1;const r=this.isNearBottom();let a=s.querySelector(".chat-message-text");if(!a){const l=document.createElement("div");l.className="chat-message-text";const h=s.querySelector(".chat-streaming");h?s.insertBefore(l,h):s.appendChild(l),a=l}return a.textContent=e,r&&this.scheduleScrollToBottom(),!0}showErrorInMessage(i,e){const t=this.messages.findIndex(s=>s.id===i);t!==-1&&(this.messages[t].content=`${this.translations.errorPrefix} ${e}`,this.renderMessages())}renderMessages(i=!1){if(!this.messagesContainer)return;if(this.messages.length===0){this.messagesContainer.innerHTML=this.renderEmptyStateHTML();return}const e=this.messages.map(t=>this.renderMessage(t,i&&t.id===this.currentStreamingMessageId)).join("");this.messagesContainer.innerHTML=e,this.scheduleScrollToBottom()}renderMessage(i,e=!1){const t=this.translations,s=`chat-message-${i.role}`,r=i.role==="user"?t.userAvatar:t.assistantAvatar,a=t.loadingMessages[this.loadingMessageIndex]??"",l=i.content?e?c(i.content):Ee(i.content):"";return`
      <div class="chat-message ${s}" data-message-id="${c(i.id)}">
        <div class="chat-message-avatar">${c(r)}</div>
        <div class="chat-message-content">
          <div class="chat-message-bubble">
            ${l?`<div class="chat-message-text">${l}</div>`:""}
            ${e?`<div class="chat-streaming"><span class="chat-streaming-dot"></span><span class="chat-streaming-dot"></span><span class="chat-streaming-dot"></span><span class="loading-text">${c(a)}</span></div>`:""}
          </div>
          <div class="chat-message-metadata">
            <span class="chat-message-time">${c(pe(i.timestamp,this.translations))}</span>
          </div>
        </div>
      </div>
    `}isNearBottom(){const i=this.messagesContainer;return i?i.scrollHeight-i.scrollTop-i.clientHeight<Le:!0}scheduleScrollToBottom(){this.messagesContainer&&this.pendingScrollFrame===null&&(this.pendingScrollFrame=requestAnimationFrame(()=>{this.pendingScrollFrame=null;const i=this.messagesContainer;i&&(i.scrollTop=i.scrollHeight)}))}setStreamingState(i){this.isStreaming=i,this.inputElement&&(this.inputElement.disabled=i),this.sendButton&&(this.sendButton.disabled=i,this.sendButton.innerHTML=i?'<div class="loading"></div>':`<span>${c(this.translations.sendButtonLabel)}</span>`),i?this.startLoadingMessages():this.clearLoadingMessages()}startLoadingMessages(){this.clearLoadingMessages();const i=this.translations.loadingMessages;this.loadingMessageIndex=Math.floor(Math.random()*i.length),this.loadingMessageInterval=setInterval(()=>{const e=this.translations.loadingMessages;if(this.loadingMessageIndex=(this.loadingMessageIndex+1)%e.length,!this.isStreaming)return;this.updateLoadingTextDOM(e[this.loadingMessageIndex]??"")||this.renderMessages(!0)},B)}updateLoadingTextDOM(i){if(!this.messagesContainer||!this.currentStreamingMessageId)return!1;const e=this.messagesContainer.querySelector(`[data-message-id="${CSS.escape(this.currentStreamingMessageId)}"]`);if(!e)return!1;const t=e.querySelector(".chat-streaming .loading-text");return t?(t.textContent=i,!0):!1}clearLoadingMessages(){this.loadingMessageInterval&&(clearInterval(this.loadingMessageInterval),this.loadingMessageInterval=null)}getMessages(){return[...this.messages]}clearMessages(){this.currentChatAbortController&&(this.currentChatAbortController.abort(),this.currentChatAbortController=null),this.isStreaming&&(this.setStreamingState(!1),this.currentStreamingMessageId=null),this.pendingScrollFrame!==null&&(cancelAnimationFrame(this.pendingScrollFrame),this.pendingScrollFrame=null),this.messages=[],this.renderMessages()}setMessages(i){this.messages=[...i],this.renderMessages()}setProps(i){this.props=i,this.translations=g(i.translations),this.detachEventListeners(),this.render(),this.attachEventListeners(),this.renderMessages(this.isStreaming),this.isStreaming&&this.setStreamingState(!0)}detachEventListeners(){this.inputElement&&(this.handleInputResize&&this.inputElement.removeEventListener("input",this.handleInputResize),this.handleInputKeydown&&this.inputElement.removeEventListener("keydown",this.handleInputKeydown)),this.sendButton&&this.handleSendClick&&this.sendButton.removeEventListener("click",this.handleSendClick),this.handleInputResize=null,this.handleInputKeydown=null,this.handleSendClick=null}destroy(){this.currentChatAbortController&&(this.currentChatAbortController.abort(),this.currentChatAbortController=null),this.clearLoadingMessages(),this.pendingScrollFrame!==null&&(cancelAnimationFrame(this.pendingScrollFrame),this.pendingScrollFrame=null),this.isStreaming&&this.client.cancelAllRequests(),this.inputElement&&(this.handleInputResize&&this.inputElement.removeEventListener("input",this.handleInputResize),this.handleInputKeydown&&this.inputElement.removeEventListener("keydown",this.handleInputKeydown)),this.sendButton&&this.handleSendClick&&this.sendButton.removeEventListener("click",this.handleSendClick),this.handleInputResize=null,this.handleInputKeydown=null,this.handleSendClick=null}}const Z="chat-bubble-snippet";class X extends HTMLElement{constructor(){super();o(this,"shadow");o(this,"client",null);o(this,"chatView",null);o(this,"container",null);o(this,"isExpanded",!1);o(this,"isMinimized",!1);o(this,"translationsOverride",null);o(this,"resolvedTranslations",g(null));o(this,"chatQueryRewriteOverride",null);o(this,"handleBubbleClick",null);o(this,"handleCloseClick",null);o(this,"handleMinimizeClick",null);o(this,"handleClearClick",null);this.shadow=this.attachShadow({mode:"open"})}static get observedAttributes(){return["api-url","placeholder","theme","hide-branding","translations","chat-query-rewrite"]}connectedCallback(){this.syncTranslationsFromAttribute(),this.render(),this.initializeClient(),this.dispatchEvent(x("ready",void 0))}disconnectedCallback(){this.cleanup()}attributeChangedCallback(e,t,s){t!==s&&(e==="api-url"?this.initializeClient():e==="theme"?this.updateTheme(s):e==="translations"&&(this.syncTranslationsFromAttribute(),this.isConnected&&this.rerenderAfterTranslationsChange()))}get translations(){return this.translationsOverride}get chatQueryRewrite(){return this.chatQueryRewriteOverride}set chatQueryRewrite(e){this.chatQueryRewriteOverride=e??null,this.chatView&&this.chatView.setProps(this.getProps())}set translations(e){this.translationsOverride=e??null,this.resolvedTranslations=g(this.translationsOverride),this.isConnected&&this.rerenderAfterTranslationsChange()}syncTranslationsFromAttribute(){if(this.translationsOverride){this.resolvedTranslations=g(this.translationsOverride);return}const e=T(this.getAttribute("translations"),"ChatBubbleSnippet");this.resolvedTranslations=g(e)}rerenderAfterTranslationsChange(){const e=this.isExpanded,t=this.isMinimized;this.removeEventListeners();const s=this.chatView?this.shadow.querySelector(".chat-content"):null;s?.parentNode&&s.parentNode.removeChild(s),this.render(),e&&(this.shadow.querySelector(".bubble-button")?.classList.add("hidden"),this.shadow.querySelector(".chat-window")?.classList.add("expanded"),t&&this.shadow.querySelector(".chat-window")?.classList.add("minimized"));const r=this.shadow.querySelector(".chat-window");if(this.chatView&&s&&r){const a=r.querySelector(".chat-content");a?r.replaceChild(s,a):r.appendChild(s),this.chatView.setProps(this.getProps())}else e&&this.initializeChatView()}getProps(){const e=this.resolvedTranslations;return{apiUrl:b(this.getAttribute("api-url"),""),placeholder:b(this.getAttribute("placeholder"),e.chatPlaceholder),theme:b(this.getAttribute("theme"),"auto"),hideBranding:w(this.getAttribute("hide-branding"),!1),translations:this.translationsOverride??void 0,chatQueryRewrite:this.resolveChatQueryRewrite()}}resolveChatQueryRewrite(){return this.chatQueryRewriteOverride!==null?this.chatQueryRewriteOverride:F(this.getAttribute("chat-query-rewrite"),"ChatBubbleSnippet")}initializeClient(){const e=this.getProps();if(!e.apiUrl){console.error("ChatBubbleSnippet: api-url attribute is required"),this.client=null;return}try{this.client=A(e.apiUrl)}catch(t){console.error("ChatBubbleSnippet:",t)}}render(){const e=document.createElement("style");e.textContent=`${I}
${J}
${this.getBubbleStyles()}`,this.container=document.createElement("div"),this.container.className="chat-bubble-widget",this.container.innerHTML=this.getBaseHTML(),this.shadow.innerHTML="",this.shadow.appendChild(e),this.shadow.appendChild(this.container),this.attachEventListeners()}getBubbleStyles(){return`
      .chat-bubble-widget {
        position: var(--chat-bubble-position);
        bottom: var(--chat-bubble-button-bottom);
        right: var(--chat-bubble-button-right);
        z-index: var(--chat-bubble-button-z-index);
        font-family: var(--search-snippet-font-family);
        font-size: var(--search-snippet-font-size-base);
      }

      .bubble-button {
        width: var(--chat-bubble-button-size);
        height: var(--chat-bubble-button-size);
        border-radius: var(--chat-bubble-button-radius);
        background: var(--search-snippet-primary-color);
        border: none;
        cursor: pointer;
        box-shadow: var(--chat-bubble-button-shadow);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
      }

      .bubble-button:hover {
        background: var(--search-snippet-primary-hover);
        transform: scale(1.05);
      }

      .bubble-button svg {
        width: var(--chat-bubble-button-icon-size);
        height: var(--chat-bubble-button-icon-size);
        color: var(--chat-bubble-button-icon-color);
      }

      .bubble-button.hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0);
      }

      .chat-window {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 380px;
        height: 500px;
        background: var(--search-snippet-background);
        border-radius: var(--search-snippet-border-radius);
        box-shadow: var(--chat-bubble-window-shadow);
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: scale(0.8) translateY(20px);
        transform-origin: bottom right;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: none;
        overflow: hidden;
        border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
      }

      .chat-window.expanded {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: auto;
      }

      .chat-window.minimized {
        height: 58px;
        overflow: hidden;
      }

      .chat-header {
        background: var(--search-snippet-surface);
        padding: var(--search-snippet-spacing-md);
        border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .chat-header-title {
        font-weight: var(--search-snippet-font-weight-bold);
        color: var(--search-snippet-text-color);
        display: flex;
        align-items: center;
        gap: var(--search-snippet-spacing-sm);
        font-size: var(--search-snippet-font-size-lg);
      }

      .chat-header-title svg {
        width: 20px;
        height: 20px;
      }

      .chat-header-actions {
        display: flex;
        gap: var(--search-snippet-spacing-xs);
      }

      .icon-button {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: var(--search-snippet-border-radius);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background var(--search-snippet-transition-fast);
        color: var(--search-snippet-text-color);
      }

      .icon-button:hover {
        background: var(--search-snippet-hover-background);
      }

      .icon-button svg {
        width: 18px;
        height: 18px;
      }

      .chat-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      @media (max-width: 480px) {
        .chat-window {
          width: calc(100vw - 40px);
          max-width: 400px;
        }
      }
    `}getBaseHTML(){const e=this.getProps(),t=this.resolvedTranslations,s=e.hideBranding?"":`<div class="powered-by">${R}</div>`;return`
      <button class="bubble-button" aria-label="${c(t.openChatAriaLabel)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      <div class="chat-window">
        <div class="chat-header">
          <div class="chat-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>${c(t.chatTitle)}</span>
          </div>
          <div class="chat-header-actions">
            <button class="icon-button clear-button" aria-label="${c(t.clearHistoryAriaLabel)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button class="icon-button minimize-button" aria-label="${c(t.minimizeAriaLabel)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button class="icon-button close-button" aria-label="${c(t.closeAriaLabel)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="chat-content"></div>
        ${s}
      </div>
    `}attachEventListeners(){const e=this.shadow.querySelector(".bubble-button"),t=this.shadow.querySelector(".close-button"),s=this.shadow.querySelector(".minimize-button"),r=this.shadow.querySelector(".clear-button");this.handleBubbleClick=()=>this.toggleChat(),this.handleCloseClick=()=>this.closeChat(),this.handleMinimizeClick=()=>this.toggleMinimize(),this.handleClearClick=()=>this.clearChat(),e?.addEventListener("click",this.handleBubbleClick),t?.addEventListener("click",this.handleCloseClick),s?.addEventListener("click",this.handleMinimizeClick),r?.addEventListener("click",this.handleClearClick)}removeEventListeners(){const e=this.shadow.querySelector(".bubble-button"),t=this.shadow.querySelector(".close-button"),s=this.shadow.querySelector(".minimize-button"),r=this.shadow.querySelector(".clear-button");this.handleBubbleClick&&e?.removeEventListener("click",this.handleBubbleClick),this.handleCloseClick&&t?.removeEventListener("click",this.handleCloseClick),this.handleMinimizeClick&&s?.removeEventListener("click",this.handleMinimizeClick),this.handleClearClick&&r?.removeEventListener("click",this.handleClearClick),this.handleBubbleClick=null,this.handleCloseClick=null,this.handleMinimizeClick=null,this.handleClearClick=null}toggleChat(){this.isExpanded=!this.isExpanded;const e=this.shadow.querySelector(".bubble-button"),t=this.shadow.querySelector(".chat-window");this.isExpanded?(e?.classList.add("hidden"),t?.classList.add("expanded"),this.initializeChatView()):(e?.classList.remove("hidden"),t?.classList.remove("expanded"))}closeChat(){this.isExpanded=!1,this.isMinimized=!1;const e=this.shadow.querySelector(".bubble-button"),t=this.shadow.querySelector(".chat-window");e?.classList.remove("hidden"),t?.classList.remove("expanded","minimized")}toggleMinimize(){this.isMinimized=!this.isMinimized;const e=this.shadow.querySelector(".chat-window");this.isMinimized?e?.classList.add("minimized"):e?.classList.remove("minimized")}initializeChatView(){if(this.chatView)return;const e=this.shadow.querySelector(".chat-content");if(!e)return;if(!this.client){const s=this.resolvedTranslations;e.innerHTML=`
        <div style="padding: 16px; color: var(--search-snippet-error-color, #ef4444); font-family: var(--search-snippet-font-family, sans-serif); font-size: var(--search-snippet-font-size-base, 14px);">
          <strong>${c(s.errorPrefix)}</strong> ${c(s.missingApiUrlError)}
        </div>
      `;return}const t=this.getProps();this.chatView=new W(e,this.client,t)}updateTheme(e){(e==="light"||e==="dark"?e:null)===null&&this.hasAttribute("theme")&&this.getAttribute("theme")!=="auto"&&this.removeAttribute("theme")}cleanup(){this.removeEventListeners(),this.client&&this.client.cancelAllRequests(),this.chatView&&this.chatView.destroy()}clearChat(){this.chatView?.clearMessages()}async sendMessage(e){this.chatView&&await this.chatView.sendMessage(e)}getMessages(){return this.chatView?.getMessages()||[]}}customElements.get(Z)||customElements.define(Z,X);const ee="chat-page-snippet",te="chat-page-sessions";class se extends HTMLElement{constructor(){super();o(this,"shadow");o(this,"client",null);o(this,"chatView",null);o(this,"container",null);o(this,"sessions",[]);o(this,"currentSessionId",null);o(this,"sidebarCollapsed",!1);o(this,"translationsOverride",null);o(this,"resolvedTranslations",g(null));o(this,"chatQueryRewriteOverride",null);o(this,"handleClearClick",null);o(this,"handleNewChatClick",null);o(this,"handleToggleSidebarClick",null);o(this,"handleChatListClick",null);o(this,"handleMessageEvent",null);this.shadow=this.attachShadow({mode:"open"}),this.loadSessions()}static get observedAttributes(){return["api-url","placeholder","theme","hide-branding","translations","chat-query-rewrite"]}connectedCallback(){this.syncTranslationsFromAttribute(),this.render(),this.initializeClient(),this.setupView(),this.dispatchEvent(x("ready",void 0))}disconnectedCallback(){this.saveCurrentSession(),this.cleanup()}attributeChangedCallback(e,t,s){t!==s&&(e==="api-url"?(this.initializeClient(),this.setupView()):e==="theme"?this.updateTheme(s):e==="translations"&&(this.syncTranslationsFromAttribute(),this.isConnected&&this.rerenderAfterTranslationsChange()))}get translations(){return this.translationsOverride}get chatQueryRewrite(){return this.chatQueryRewriteOverride}set chatQueryRewrite(e){this.chatQueryRewriteOverride=e??null,this.chatView&&this.chatView.setProps(this.getProps())}set translations(e){this.translationsOverride=e??null,this.resolvedTranslations=g(this.translationsOverride),this.refreshDefaultSessionTitles(),this.isConnected&&this.rerenderAfterTranslationsChange()}syncTranslationsFromAttribute(){if(this.translationsOverride){this.resolvedTranslations=g(this.translationsOverride),this.refreshDefaultSessionTitles();return}const e=T(this.getAttribute("translations"),"ChatPageSnippet");this.resolvedTranslations=g(e),this.refreshDefaultSessionTitles()}refreshDefaultSessionTitles(){if(this.sessions.length===0)return;const e=this.resolvedTranslations.newChatButton;let t=!1;for(const s of this.sessions)s.titleIsDefault&&s.title!==e&&(s.title=e,t=!0);t&&this.saveSessions()}rerenderAfterTranslationsChange(){this.removeEventListeners();const e=this.chatView?this.shadow.querySelector(".container"):null;e?.parentNode&&e.parentNode.removeChild(e),this.render(),this.attachEventListeners(),this.renderChatList();const t=this.shadow.querySelector(".chat-page-content");if(this.chatView&&e&&t){const s=t.querySelector(".container");s?t.replaceChild(e,s):t.appendChild(e),this.chatView.setProps(this.getProps()),this.handleMessageEvent=()=>{this.saveCurrentSession(),this.updateSessionTitle(),this.renderChatList()},e.addEventListener("message",this.handleMessageEvent)}}getProps(){const e=this.resolvedTranslations;return{apiUrl:b(this.getAttribute("api-url"),""),placeholder:b(this.getAttribute("placeholder"),e.chatPlaceholder),theme:b(this.getAttribute("theme"),"auto"),hideBranding:w(this.getAttribute("hide-branding"),!1),translations:this.translationsOverride??void 0,chatQueryRewrite:this.resolveChatQueryRewrite()}}resolveChatQueryRewrite(){return this.chatQueryRewriteOverride!==null?this.chatQueryRewriteOverride:F(this.getAttribute("chat-query-rewrite"),"ChatPageSnippet")}initializeClient(){const e=this.getProps();if(!e.apiUrl){console.error("ChatPageSnippet: api-url attribute is required"),this.client=null;return}try{this.client=A(e.apiUrl)}catch(t){console.error("ChatPageSnippet:",t)}}render(){const e=document.createElement("style");e.textContent=`${I}
${J}
${this.getPageStyles()}`,this.container=document.createElement("div"),this.container.className="chat-page-container",this.container.innerHTML=this.getBaseHTML(),this.shadow.innerHTML="",this.shadow.appendChild(e),this.shadow.appendChild(this.container),this.attachEventListeners()}getPageStyles(){return`
      :host {
        display: block;
        width: 100%;
        height: 100vh;
      }

      .chat-page-container {
        display: flex;
        height: 100%;
        background: var(--search-snippet-background);
      }

      /* Sidebar styles */
      .chat-sidebar {
        width: 280px;
        min-width: 280px;
        background: var(--search-snippet-surface);
        border-right: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        display: flex;
        flex-direction: column;
        transition: var(--search-snippet-transition);
        overflow: hidden;
      }

      .chat-sidebar.collapsed {
        width: 0;
        min-width: 0;
        border-right: none;
      }

      .sidebar-header {
        padding: var(--search-snippet-spacing-lg);
        border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        height: 69px;
      }

      .sidebar-title {
        font-size: var(--search-snippet-font-size-lg);
        font-weight: var(--search-snippet-font-weight-bold);
        color: var(--search-snippet-text-color);
      }

      .new-chat-button {
        width: 100%;
        height: var(--search-snippet-button-height);
        margin: var(--search-snippet-spacing-md) var(--search-snippet-spacing-lg);
        padding: 0 var(--search-snippet-spacing-lg);
        font-family: var(--search-snippet-font-family);
        font-size: var(--search-snippet-font-size-base);
        font-weight: var(--search-snippet-font-weight-medium);
        color: #fff;
        background: var(--search-snippet-primary-color);
        border: none;
        border-radius: var(--search-snippet-border-radius);
        cursor: pointer;
        outline: none;
        transition: var(--search-snippet-transition);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--search-snippet-spacing-sm);
        box-sizing: border-box;
        width: calc(100% - var(--search-snippet-spacing-lg) * 2);
      }

      .new-chat-button:hover {
        opacity: 0.9;
      }

      .new-chat-button svg {
        width: 16px;
        height: 16px;
      }

      .chat-list {
        flex: 1;
        overflow-y: auto;
        padding: var(--search-snippet-spacing-sm);
      }

      .chat-list-item {
        display: flex;
        align-items: center;
        padding: var(--search-snippet-spacing-md) var(--search-snippet-spacing-lg);
        margin-bottom: var(--search-snippet-spacing-xs);
        border-radius: var(--search-snippet-border-radius);
        cursor: pointer;
        transition: var(--search-snippet-transition);
        gap: var(--search-snippet-spacing-sm);
      }

      .chat-list-item:hover {
        background: var(--search-snippet-hover-background);
      }

      .chat-list-item.active {
        background: var(--search-snippet-hover-background);
        border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
      }

      .chat-list-item-content {
        flex: 1;
        min-width: 0;
      }

      .chat-list-item-title {
        font-size: var(--search-snippet-font-size-base);
        font-weight: var(--search-snippet-font-weight-medium);
        color: var(--search-snippet-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chat-list-item-date {
        font-size: var(--search-snippet-font-size-sm);
        color: var(--search-snippet-text-secondary);
        margin-top: 2px;
      }

      .chat-list-item-delete {
        opacity: 0;
        background: none;
        border: none;
        padding: var(--search-snippet-spacing-xs);
        cursor: pointer;
        color: var(--search-snippet-text-secondary);
        border-radius: var(--search-snippet-border-radius-sm);
        transition: var(--search-snippet-transition);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chat-list-item:hover .chat-list-item-delete {
        opacity: 1;
      }

      .chat-list-item-delete:hover {
        background: var(--search-snippet-error-background, rgba(239, 68, 68, 0.1));
        color: var(--search-snippet-error-color, #ef4444);
      }

      .chat-list-item-delete svg {
        width: 14px;
        height: 14px;
      }

      .chat-list-empty {
        padding: var(--search-snippet-spacing-xl);
        text-align: center;
        color: var(--search-snippet-text-secondary);
        font-size: var(--search-snippet-font-size-sm);
      }

      /* Main content area */
      .chat-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .chat-page-header {
        background: var(--search-snippet-surface);
        padding: var(--search-snippet-spacing-lg);
        border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .chat-page-header-left {
        display: flex;
        align-items: center;
        gap: var(--search-snippet-spacing-md);
      }

      .toggle-sidebar-button {
        width: 36px;
        height: 36px;
        padding: 0;
        font-family: var(--search-snippet-font-family);
        color: var(--search-snippet-text-color);
        background: var(--search-snippet-background);
        border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        border-radius: var(--search-snippet-border-radius);
        cursor: pointer;
        outline: none;
        transition: var(--search-snippet-transition);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .toggle-sidebar-button:hover {
        background: var(--search-snippet-hover-background);
      }

      .toggle-sidebar-button svg {
        width: 18px;
        height: 18px;
      }

      .chat-page-header-title {
        font-size: var(--search-snippet-font-size-xl);
        font-weight: var(--search-snippet-font-weight-bold);
        color: var(--search-snippet-text-color);
        display: flex;
        align-items: center;
        gap: var(--search-snippet-spacing-md);
      }

      .chat-page-header-title svg {
        width: 28px;
        height: 28px;
      }

      .chat-page-header-actions {
        display: flex;
        gap: var(--search-snippet-spacing-sm);
      }

      .header-button {
        height: var(--search-snippet-button-height);
        padding: 0 var(--search-snippet-spacing-lg);
        font-family: var(--search-snippet-font-family);
        font-size: var(--search-snippet-font-size-base);
        font-weight: var(--search-snippet-font-weight-medium);
        color: var(--search-snippet-text-color);
        background: var(--search-snippet-background);
        border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        border-radius: var(--search-snippet-border-radius);
        cursor: pointer;
        outline: none;
        transition: var(--search-snippet-transition);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--search-snippet-spacing-sm);
      }

      .header-button:hover {
        background: var(--search-snippet-hover-background);
      }

      .header-button svg {
        width: 16px;
        height: 16px;
      }

      .chat-page-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      .container {
        border: none;
        box-shadow: none;
        height: 100%;
        width: 100%;
        background: var(--search-snippet-background);
        border-radius: 0;
      }
    `}getBaseHTML(){const e=this.getProps(),t=this.resolvedTranslations,s=e.hideBranding?"":`<div class="powered-by">${R}</div>`;return`
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">${c(t.historyTitle)}</span>
        </div>
        <button class="new-chat-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          ${c(t.newChatButton)}
        </button>
        <div class="chat-list"></div>
        ${s}
      </div>
      <div class="chat-main">
        <div class="chat-page-header">
          <div class="chat-page-header-left">
            <button class="toggle-sidebar-button" title="${c(t.toggleSidebarTitle)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12h18M3 6h18M3 18h18"></path>
              </svg>
            </button>
            <div class="chat-page-header-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>${c(t.chatTitle)}</span>
            </div>
          </div>
          <div class="chat-page-header-actions">
            <button class="header-button clear-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              ${c(t.clearChatButton)}
            </button>
          </div>
        </div>
        <div class="chat-page-content">
          <div class="container"></div>
        </div>
      </div>
    `}attachEventListeners(){const e=this.shadow.querySelector(".clear-button"),t=this.shadow.querySelector(".new-chat-button"),s=this.shadow.querySelector(".toggle-sidebar-button"),r=this.shadow.querySelector(".chat-list");this.handleClearClick=()=>this.clearCurrentChat(),this.handleNewChatClick=()=>this.createNewChat(),this.handleToggleSidebarClick=()=>this.toggleSidebar(),this.handleChatListClick=a=>this.onChatListClick(a),e?.addEventListener("click",this.handleClearClick),t?.addEventListener("click",this.handleNewChatClick),s?.addEventListener("click",this.handleToggleSidebarClick),r?.addEventListener("click",this.handleChatListClick)}removeEventListeners(){const e=this.shadow.querySelector(".clear-button"),t=this.shadow.querySelector(".new-chat-button"),s=this.shadow.querySelector(".toggle-sidebar-button"),r=this.shadow.querySelector(".chat-list"),a=this.shadow.querySelector(".container");this.handleClearClick&&e?.removeEventListener("click",this.handleClearClick),this.handleNewChatClick&&t?.removeEventListener("click",this.handleNewChatClick),this.handleToggleSidebarClick&&s?.removeEventListener("click",this.handleToggleSidebarClick),this.handleChatListClick&&r?.removeEventListener("click",this.handleChatListClick),this.handleMessageEvent&&a&&a.removeEventListener("message",this.handleMessageEvent),this.handleClearClick=null,this.handleNewChatClick=null,this.handleToggleSidebarClick=null,this.handleChatListClick=null,this.handleMessageEvent=null}setupView(){const e=this.shadow.querySelector(".container");if(!this.client){if(e){const s=this.resolvedTranslations;e.innerHTML=`
          <div style="padding: 16px; color: var(--search-snippet-error-color, #ef4444); font-family: var(--search-snippet-font-family, sans-serif); font-size: var(--search-snippet-font-size-base, 14px);">
            <strong>${c(s.errorPrefix)}</strong> ${c(s.missingApiUrlError)}
          </div>
        `}return}if(!e)return;const t=this.getProps();if(this.chatView=new W(e,this.client,t),this.sessions.length===0)this.createNewChat();else{const s=this.sessions[0];this.switchToSession(s.id)}this.handleMessageEvent=()=>{this.saveCurrentSession(),this.updateSessionTitle(),this.renderChatList()},e.addEventListener("message",this.handleMessageEvent),this.renderChatList()}generateSessionId(){return`session_${Date.now()}_${Math.random().toString(36).substring(2,9)}`}loadSessions(){try{const e=localStorage.getItem(te);e&&(this.sessions=JSON.parse(e),this.sessions.sort((t,s)=>s.updatedAt-t.updatedAt))}catch(e){console.error("Failed to load chat sessions:",e)}}saveSessions(){try{localStorage.setItem(te,JSON.stringify(this.sessions))}catch(e){console.error("Failed to save chat sessions:",e)}}saveCurrentSession(){if(!this.currentSessionId||!this.chatView)return;const e=this.sessions.findIndex(t=>t.id===this.currentSessionId);e!==-1&&(this.sessions[e].messages=this.chatView.getMessages(),this.sessions[e].updatedAt=Date.now(),this.saveSessions())}updateSessionTitle(){if(!this.currentSessionId)return;const e=this.sessions.find(r=>r.id===this.currentSessionId);if(!e||e.messages.length===0||!(e.titleIsDefault??e.title===this.resolvedTranslations.newChatButton))return;const s=e.messages.find(r=>r.role==="user");s&&(e.title=s.content.slice(0,50)+(s.content.length>50?"...":""),e.titleIsDefault=!1,this.saveSessions())}createNewChat(){this.saveCurrentSession();const e={id:this.generateSessionId(),title:this.resolvedTranslations.newChatButton,messages:[],createdAt:Date.now(),updatedAt:Date.now(),titleIsDefault:!0};this.sessions.unshift(e),this.currentSessionId=e.id,this.saveSessions(),this.chatView?.clearMessages(),this.renderChatList()}switchToSession(e){if(e===this.currentSessionId)return;this.saveCurrentSession();const t=this.sessions.find(s=>s.id===e);t&&this.chatView&&(this.currentSessionId=e,this.chatView.setMessages(t.messages),this.renderChatList())}deleteSession(e){const t=this.sessions.findIndex(s=>s.id===e);t!==-1&&(this.sessions.splice(t,1),this.saveSessions(),e===this.currentSessionId&&(this.sessions.length>0?this.switchToSession(this.sessions[0].id):this.createNewChat()),this.renderChatList())}clearCurrentChat(){if(!this.currentSessionId)return;const e=this.sessions.find(t=>t.id===this.currentSessionId);e&&(e.messages=[],e.title=this.resolvedTranslations.newChatButton,e.titleIsDefault=!0,e.updatedAt=Date.now(),this.saveSessions()),this.chatView?.clearMessages(),this.renderChatList()}toggleSidebar(){this.sidebarCollapsed=!this.sidebarCollapsed,this.shadow.querySelector(".chat-sidebar")?.classList.toggle("collapsed",this.sidebarCollapsed)}onChatListClick(e){const t=e.target,s=t.closest(".chat-list-item-delete");if(s){e.stopPropagation();const a=s.getAttribute("data-session-id");a&&this.deleteSession(a);return}const r=t.closest(".chat-list-item");if(r){const a=r.getAttribute("data-session-id");a&&this.switchToSession(a)}}renderChatList(){const e=this.shadow.querySelector(".chat-list");if(!e)return;const t=this.resolvedTranslations;if(this.sessions.length===0){e.innerHTML=`<div class="chat-list-empty">${this.escapeHTML(t.noChatsYet)}</div>`;return}e.innerHTML=this.sessions.map(s=>this.renderChatListItem(s)).join("")}renderChatListItem(e){const t=e.id===this.currentSessionId,s=this.formatDate(e.updatedAt),r=this.resolvedTranslations.deleteChatTitle;return`
      <div class="chat-list-item ${t?"active":""}" data-session-id="${e.id}">
        <div class="chat-list-item-content">
          <div class="chat-list-item-title">${this.escapeHTML(e.title)}</div>
          <div class="chat-list-item-date">${s}</div>
        </div>
        <button class="chat-list-item-delete" data-session-id="${e.id}" title="${this.escapeHTML(r)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `}formatDate(e){const t=new Date(e),r=new Date().getTime()-t.getTime(),a=Math.floor(r/(1e3*60*60*24));return a===0?t.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"}):a===1?this.resolvedTranslations.yesterday:a<7?t.toLocaleDateString(void 0,{weekday:"long"}):t.toLocaleDateString(void 0,{month:"short",day:"numeric"})}escapeHTML(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}updateTheme(e){(e==="light"||e==="dark"?e:null)===null&&this.hasAttribute("theme")&&this.getAttribute("theme")!=="auto"&&this.removeAttribute("theme")}cleanup(){this.removeEventListeners(),this.client&&this.client.cancelAllRequests(),this.chatView&&this.chatView.destroy()}clearChat(){this.clearCurrentChat()}async sendMessage(e){this.chatView&&(await this.chatView.sendMessage(e),this.saveCurrentSession())}getMessages(){return this.chatView?.getMessages()||[]}getSessions(){return[...this.sessions]}getCurrentSession(){return this.sessions.find(e=>e.id===this.currentSessionId)||null}}customElements.get(ee)||customElements.define(ee,se);const Te=`
/* Search view states */
.search-view {
  transition: var(--search-snippet-transition-slow);
  background: var(--search-snippet-background);
  border-radius: var(--search-snippet-border-radius);
  padding: 0px;
}

.search-view-collapsed {
  max-height: 60px;
}

.search-view-expanded {
  max-height: var(--search-snippet-max-height);
}


.search-icon {
  width: var(--search-snippet-icon-size);
  height: var(--search-snippet-icon-size);
  margin-left: var(--search-snippet-icon-margin-left);
  color: var(--search-snippet-text-color);
}

/* Search input wrapper */
.search-input-wrapper {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--search-snippet-spacing-sm);
  overflow: hidden;
  transition: max-width var(--search-snippet-transition-slow), 
              opacity var(--search-snippet-transition);
  padding: var(--search-snippet-spacing-sm);
  border-radius: var(--search-snippet-border-radius);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
}



.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--search-snippet-text-color);
  font-size: var(--search-snippet-font-size-base);
  font-weight: var(--search-snippet-font-weight-medium);
  box-shadow: none;
  padding: 0;
}

.search-input::placeholder {
  color: var(--search-snippet-text-secondary);
}

.search-view:has(.search-input:not(:placeholder-shown)) .search-input-wrapper, .search-view:has(.search-input:not(:placeholder-shown)) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.search-view:focus-within {
  border-color: var(--search-snippet-primary-color);
  box-shadow: inset 0 0 0 3px var(--search-snippet-focus-ring);
}

.search-view:has(.search-input:not(:placeholder-shown)) .search-content {
  max-height: 600px;
  opacity: 1;
  overflow-y: auto;
  padding: 8px;
}

.search-submit-button {
  flex-shrink: 0;
  position: relative;
  border-radius: max(var(--search-snippet-button-min-border-radius, 4px), calc(var(--search-snippet-border-radius) - var(--search-snippet-spacing-sm)))
}

.search-loading-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  visibility: hidden;
}

.search-loading-indicator .loading {
  width: 16px;
  height: 16px;
}

.search-submit-button.is-loading .search-submit-label {
  visibility: hidden;
}

.search-submit-button.is-loading .search-loading-indicator {
  visibility: visible;
}

/* Search content */
.search-content {
  max-height: 0;
  opacity: 0;
  transition: max-height var(--search-snippet-transition-slow),
              opacity var(--search-snippet-transition);
  position: absolute;
  width: 100%;
  background: var(--search-snippet-background);
  border-bottom-left-radius: var(--search-snippet-border-radius);
  border-bottom-right-radius: var(--search-snippet-border-radius);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-top: none;
}

.search-content::-webkit-scrollbar {
  width: 8px;
  height: 100px;
}

.search-content::-webkit-scrollbar-track {
  background: var(--search-snippet-surface);
  
}

.search-content::-webkit-scrollbar-thumb {
  background: var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
}

.search-content::-webkit-scrollbar-thumb:hover {
  background: var(--search-snippet-text-secondary);
}

.container {
  overflow: unset;
  position: relative;
  border: none;
}

.container:has(.search-input:not(:placeholder-shown)) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}


/* Override header for search mode */

/* Search results */
.search-results {
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-sm);
}

.result-group {
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-sm);
}

.result-group + .result-group {
  margin-top: var(--search-snippet-spacing-md);
}

.result-group-header {
  padding: var(--search-snippet-spacing-xs) 0;
  color: var(--search-snippet-text-secondary);
  font-size: var(--search-snippet-font-size-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

a.search-result-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--search-snippet-spacing-md);
  padding: var(--search-snippet-spacing-md);
  background: var(--search-snippet-surface);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
  cursor: pointer;
  transition: var(--search-snippet-transition);
  text-decoration: none;
  color: inherit;
}

/* Image thumbnail container */
.search-result-image-container {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: calc(var(--search-snippet-border-radius) - 4px);
  overflow: hidden;
  position: relative;
}

.search-result-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity var(--search-snippet-transition);
}

.search-result-image.loaded {
  opacity: 1;
}

/* Loading shimmer */
.search-result-image-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    var(--search-snippet-surface) 25%,
    var(--search-snippet-border-color) 50%,
    var(--search-snippet-surface) 75%
  );
  background-size: 200% 100%;
  animation: search-image-shimmer 1.5s infinite;
}

@keyframes search-image-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Placeholder icon */
.search-result-image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--search-snippet-text-secondary);
  opacity: 0.5;
}

.search-result-image-placeholder svg {
  width: 24px;
  height: 24px;
}

/* Content wrapper */
.search-result-content {
  flex: 1;
  min-width: 0;
}

a.search-result-item:hover {
  background: var(--search-snippet-hover-background);
  border-color: var(--search-snippet-primary-color);
  transform: translateY(-1px);
  box-shadow: var(--search-snippet-result-item-shadow);
}

a.search-result-item:focus-visible {
  outline: 2px solid var(--search-snippet-primary-color);
  outline-offset: 2px;
}

.search-result-title {
  font-size: var(--search-snippet-font-size-base);
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-color);
  margin-bottom: var(--search-snippet-spacing-xs);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.search-result-snippet {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-description);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.search-result-metadata {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-sm);
  margin-top: var(--search-snippet-spacing-xs);
  min-width: 0;
}

.search-result-url {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-primary-color);
  text-decoration: none;
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-url-empty {
  visibility: hidden;
}

.search-result-date {
  font-size: 12px;
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-secondary);
  text-align: right;
  flex-shrink: 0;
}

.search-result-url:hover {
  text-decoration: underline;
}

/* Search header */
.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--search-snippet-spacing-md);
  padding-bottom: var(--search-snippet-spacing-sm);
  border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
}

.search-count {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
}

/* Search footer */
.search-footer {
  padding: var(--search-snippet-spacing-md);
  padding-bottom: var(--search-snippet-spacing-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--search-snippet-spacing-sm);
}

/* See more link */
.search-see-more {
  display: inline-flex;
  align-items: center;
  gap: var(--search-snippet-spacing-xs);
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-primary-color);
  text-decoration: none;
  font-weight: var(--search-snippet-font-weight-medium);
  transition: color var(--search-snippet-transition-fast);
}

.search-see-more:hover {
  text-decoration: underline;
}

/* Loading state for search */
.search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--search-snippet-spacing-xxl);
  gap: var(--search-snippet-spacing-md);
  color: var(--search-snippet-text-secondary);
}

/* Empty search state */
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--search-snippet-spacing-xxl);
  gap: var(--search-snippet-spacing-md);
  color: var(--search-snippet-text-secondary);
  text-align: center;
}

.search-empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.search-empty-title {
  font-size: var(--search-snippet-font-size-lg);
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-color);
}

.search-empty-description {
  font-size: var(--search-snippet-font-size-sm);
}

/* Highlight matching text */
.search-highlight {
  background: var(--search-snippet-warning-background);
  color: var(--search-snippet-warning-color);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: var(--search-snippet-font-weight-medium);
}
`,ie="search-bar-snippet",re=10,ae=50;class O extends HTMLElement{constructor(){super();o(this,"shadow");o(this,"client",null);o(this,"stats",null);o(this,"container",null);o(this,"inputElement",null);o(this,"resultsContainer",null);o(this,"searchButton",null);o(this,"debouncedSearch",null);o(this,"currentSearchController",null);o(this,"loadingMessageInterval",null);o(this,"loadingMessageIndex",0);o(this,"translationsOverride",null);o(this,"resolvedTranslations",g(null));o(this,"lastSearchQuery","");o(this,"lastSearchTotal",0);o(this,"handleInputChange",null);o(this,"handleInputKeydownEnter",null);o(this,"handleInputKeydownEscape",null);o(this,"handleSearchButtonClick",null);o(this,"handleResultClick",null);o(this,"handleSeeMoreClick",null);this.shadow=this.attachShadow({mode:"open"})}static get observedAttributes(){return["api-url","placeholder","max-results","max-render-results","debounce-ms","theme","hide-branding","show-url","show-date","hide-thumbnails","see-more","disable-analytics","request-options","translations"]}connectedCallback(){this.syncTranslationsFromAttribute(),this.initializeClient(),this.render(),this.dispatchEvent(x("ready",void 0))}disconnectedCallback(){this.cleanup()}attributeChangedCallback(e,t,s){t!==s&&(e==="api-url"||e==="disable-analytics"?this.initializeClient():e==="theme"?this.updateTheme(s):e==="translations"&&(this.syncTranslationsFromAttribute(),this.isConnected&&this.rerender()))}get translations(){return this.translationsOverride}set translations(e){this.translationsOverride=e??null,this.resolvedTranslations=g(this.translationsOverride),this.isConnected&&this.rerender()}rerender(){const e=this.inputElement?.value??"";this.render(),e&&this.inputElement&&(this.inputElement.value=e,e.trim().length>0&&this.performSearch(e.trim()))}syncTranslationsFromAttribute(){if(this.translationsOverride){this.resolvedTranslations=g(this.translationsOverride);return}const e=T(this.getAttribute("translations"),"SearchBarSnippet");this.resolvedTranslations=g(e)}getProps(){const e=this.resolvedTranslations;return{apiUrl:b(this.getAttribute("api-url"),""),placeholder:b(this.getAttribute("placeholder"),e.placeholder),maxResults:S(this.getAttribute("max-results"),ae),maxRenderResults:S(this.getAttribute("max-render-results"),re),debounceMs:S(this.getAttribute("debounce-ms"),300),theme:b(this.getAttribute("theme"),"auto"),hideBranding:w(this.getAttribute("hide-branding"),!1),showUrl:w(this.getAttribute("show-url"),!1),showDate:w(this.getAttribute("show-date"),!1),hideThumbnails:w(this.getAttribute("hide-thumbnails"),!1),seeMore:b(this.getAttribute("see-more"),""),groupBy:b(this.getAttribute("group-by"),""),disableAnalytics:w(this.getAttribute("disable-analytics"),!1),translations:this.translationsOverride??void 0}}getRequestOptions(){const e=this.getAttribute("request-options");if(e)try{const t=JSON.parse(e);if(t===null||typeof t!="object"||Array.isArray(t))throw new Error("request-options must be a JSON object");return t}catch(t){console.error("SearchBarSnippet: invalid request-options attribute",t);return}}initializeClient(){const e=this.getProps();if(!e.apiUrl){console.error("SearchBarSnippet: api-url attribute is required"),this.client=null,this.destroyStatsClient(),this.showMissingApiUrlError();return}try{this.client=A(e.apiUrl),this.destroyStatsClient(),e.disableAnalytics||(this.stats=new q(e.apiUrl))}catch(t){console.error("SearchBarSnippet:",t)}}destroyStatsClient(){this.stats&&(this.stats.destroy(),this.stats=null)}render(){const e=this.getProps(),t=this.resolvedTranslations,s=a=>this.performSearch(a);this.debouncedSearch=N(s,e.debounceMs||400);const r=document.createElement("style");r.textContent=`${I}
${Te}`,this.container=document.createElement("div"),this.container.className="container",this.container.innerHTML=`
            <div class="search-view"> 
                <div class="search-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
                    <input
                        type="text"
                        name="search-input"
                        class="search-input"
                        placeholder="${c(e.placeholder||t.placeholder)}"
                        aria-label="${c(t.searchInputAriaLabel)}"
                        autocomplete="off"
                    />
                    <button class="button search-submit-button" aria-label="${c(t.searchButtonLabel)}">
                        <span class="search-submit-label">${c(t.searchButtonLabel)}</span>
                        <span class="search-loading-indicator" aria-hidden="true">
                            <span class="loading"></span>
                        </span>
                    </button>
                </div>
                <div class="search-content">
                    <div class="search-results-wrapper">
                        <!-- Results will be inserted here -->
                    </div>
                </div>
            </div>
        `,this.shadow.innerHTML="",this.shadow.appendChild(r),this.shadow.appendChild(this.container),this.inputElement=this.container.querySelector(".search-input"),this.resultsContainer=this.container.querySelector(".search-results-wrapper"),this.searchButton=this.container.querySelector(".search-submit-button"),this.attachEventListeners(),this.client||this.showMissingApiUrlError()}attachEventListeners(){this.inputElement&&(this.handleInputChange=e=>{const s=e.target.value.trim();s.length>0&&this.debouncedSearch?this.debouncedSearch(s):(this.debouncedSearch?.cancel(),this.currentSearchController?.abort(),this.showEmptyState())},this.inputElement.addEventListener("input",this.handleInputChange),this.handleInputKeydownEnter=e=>{if(e.key==="Enter"){const t=e.target.value.trim();t.length>0&&this.performSearch(t)}},this.inputElement.addEventListener("keydown",this.handleInputKeydownEnter),this.handleInputKeydownEscape=e=>{e.key==="Escape"&&this.inputElement&&(this.inputElement.value="")},window.addEventListener("keydown",this.handleInputKeydownEscape),this.searchButton&&(this.handleSearchButtonClick=()=>{const e=this.inputElement?.value.trim()||"";e.length>0&&this.performSearch(e)},this.searchButton.addEventListener("click",this.handleSearchButtonClick)))}async performSearch(e){if(!this.client){this.showMissingApiUrlError();return}this.currentSearchController&&(this.currentSearchController.abort(),this.currentSearchController=null);const t=new AbortController;this.currentSearchController=t,this.showLoadingState();try{const s=this.getProps(),r=await this.client.search(e,{signal:t.signal,maxResults:s.maxResults||ae,request:this.getRequestOptions()});if(t.signal.aborted||this.currentSearchController!==t)return;const a=r.slice(0,s.maxRenderResults||re);this.lastSearchQuery=e,this.lastSearchTotal=r.length,this.stats?.trackSearch(e,r.length),this.displayResults(a,e,r.length)}catch(s){if(s.name==="AbortError"||t.signal.aborted||this.currentSearchController!==t)return;this.showErrorState(s.message)}finally{this.currentSearchController===t&&(this.currentSearchController=null)}}displayResults(e,t,s=e.length){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;if(e.length===0){this.showNoResultsState(t);return}const r=this.getProps(),a=this.resolvedTranslations,l=r.hideBranding?"":`<div class="powered-by-inline">${R}</div>`,h=s>e.length,d=h?C(a.resultsCountOverflow,{n:e.length,total:s}):C(s===1?a.resultsCount:a.resultsCountPlural,{n:s}),u=r.seeMore&&h?`<div class="search-footer">
            <a href="${c(r.seeMore+encodeURIComponent(t))}" class="search-see-more">
              <span>${c(a.seeMoreResults)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>`:"",p=`
            <div class="search-header">
                <div class="search-count">
                    ${c(d)}
                </div>
                ${l}
            </div>
            <div class="search-results">
                ${r.groupBy?K(V(e,r.groupBy,a.groupOther),(m,f)=>this.renderResult(m,f)):e.map((m,f)=>this.renderResult(m,f)).join("")}
            </div>
            ${u}
        `;this.resultsContainer.innerHTML=p,this.attachResultHandlers()}renderResult(e,t){const s=this.getProps(),r=j(e.metadata?.icon),a=s.hideThumbnails?"":this.renderResultImage(e.image,e.title),l=z(e.url),h=l?c(l):"#",d=l?c(U(l)):"",u=s.showDate&&e.timestamp!==void 0?`<div class="search-result-date">${c(P(e.timestamp))}</div>`:"",p=s.showUrl&&l||u?`<div class="search-result-metadata">
            ${s.showUrl&&l?`<span class="search-result-url">${d}</span>`:'<span class="search-result-url search-result-url-empty"></span>'}
            ${u}
          </div>`:"";return`
            <a href="${h}" class="search-result-item" data-index="${t}" data-result-id="${c(e.id||"")}">
                ${r}
                ${a}
                <div class="search-result-content">
                    <div class="search-result-title">${c(e.title||"")}</div>
                    <div class="search-result-snippet">${c(e.description||"")}</div>
                    ${p}
                </div>
            </a>
        `}renderResultImage(e,t){const s='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';return e?`
      <div class="search-result-image-container">
        <div class="search-result-image-loading"></div>
        <div class="search-result-image-placeholder" style="display: none;">${s}</div>
        <img 
          class="search-result-image" 
          src="${c(e)}" 
          alt="${c(t)}"
          loading="lazy"
        />
      </div>
    `:`
        <div class="search-result-image-container">
          <div class="search-result-image-placeholder">${s}</div>
        </div>
      `}attachResultHandlers(){this.detachResultTrackingHandlers();const e=this.resultsContainer;if(!e)return;this.handleResultClick=r=>{const l=r.target?.closest(".search-result-item");if(!l)return;l.getAttribute("href")==="#"&&r.preventDefault();const d=l.getAttribute("data-index"),u=l.getAttribute("data-result-id")??"",p=d!==null?Number.parseInt(d,10):Number.NaN;!Number.isNaN(p)&&u&&this.stats?.trackClick(this.lastSearchQuery,this.lastSearchTotal,u,p)},e.addEventListener("click",this.handleResultClick);const t=e.querySelector(".search-see-more");t&&(this.handleSeeMoreClick=()=>{this.stats?.trackViewMore(this.lastSearchQuery,this.lastSearchTotal)},t.addEventListener("click",this.handleSeeMoreClick)),this.container?.querySelectorAll(".search-result-image")?.forEach(r=>{r.addEventListener("load",()=>{r.classList.add("loaded"),r.closest(".search-result-image-container")?.querySelector(".search-result-image-loading")?.remove()}),r.addEventListener("error",()=>{const a=r.closest(".search-result-image-container");a?.querySelector(".search-result-image-loading")?.remove();const l=a?.querySelector(".search-result-image-placeholder");l&&(l.style.display="flex"),r.style.display="none"})})}detachResultTrackingHandlers(){const e=this.resultsContainer;e&&this.handleResultClick&&e.removeEventListener("click",this.handleResultClick),this.handleResultClick=null,this.handleSeeMoreClick=null}showLoadingState(){if(!this.resultsContainer||(this.clearLoadingInterval(),this.setLoadingIndicator(!0),this.resultsContainer.querySelector(".search-result-item")))return;const e=this.resolvedTranslations.loadingMessages;this.loadingMessageIndex=Math.floor(Math.random()*e.length),this.resultsContainer.innerHTML=`
            <div class="search-loading">
                <div class="loading-text loading-text-animate">${c(e[this.loadingMessageIndex])}</div>
            </div>
        `,this.startLoadingInterval()}setLoadingIndicator(e){this.searchButton?.classList.toggle("is-loading",e),this.searchButton?.setAttribute("aria-busy",String(e)),this.resultsContainer?.setAttribute("aria-busy",String(e))}startLoadingInterval(){this.loadingMessageInterval=setInterval(()=>{const e=this.resolvedTranslations.loadingMessages;this.loadingMessageIndex=(this.loadingMessageIndex+1)%e.length;const t=this.resultsContainer?.querySelector(".loading-text");t&&(t.classList.remove("loading-text-animate"),t.offsetWidth,t.textContent=e[this.loadingMessageIndex],t.classList.add("loading-text-animate"))},B)}clearLoadingInterval(){this.loadingMessageInterval&&(clearInterval(this.loadingMessageInterval),this.loadingMessageInterval=null)}showEmptyState(){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;const e=this.resolvedTranslations;this.resultsContainer.innerHTML=`
            <div class="search-empty">
                <svg class="search-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <div class="search-empty-title">${c(e.emptyStateTitle)}</div>
                <div class="search-empty-description">
                    ${c(e.emptyStateDescription)}
                </div>
            </div>
        `}showNoResultsState(e){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;const t=this.resolvedTranslations;this.resultsContainer.innerHTML=`
            <div class="search-empty">
                <svg class="search-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <div class="search-empty-title">${c(t.noResultsTitle)}</div>
                <div class="search-empty-description">
                    ${c(C(t.noResultsDescription,{query:e}))}
                </div>
            </div>
        `}showErrorState(e){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;const t=this.resolvedTranslations;this.resultsContainer.innerHTML=`
            <div class="error">
                <strong>${c(t.errorPrefix)}</strong> ${c(e)}
            </div>
        `}showMissingApiUrlError(){this.resultsContainer&&this.showErrorState(this.resolvedTranslations.missingApiUrlError)}updateTheme(e){const t=e==="light"||e==="dark"||e==="auto"?e:"auto";t==="auto"?this.removeAttribute("theme"):this.setAttribute("theme",t)}cleanup(){this.clearLoadingInterval(),this.currentSearchController&&(this.currentSearchController.abort(),this.currentSearchController=null),this.client&&this.client.cancelAllRequests(),this.destroyStatsClient(),this.inputElement&&(this.handleInputChange&&this.inputElement.removeEventListener("input",this.handleInputChange),this.handleInputKeydownEnter&&this.inputElement.removeEventListener("keydown",this.handleInputKeydownEnter),this.handleInputKeydownEscape&&window.removeEventListener("keydown",this.handleInputKeydownEscape)),this.searchButton&&this.handleSearchButtonClick&&this.searchButton.removeEventListener("click",this.handleSearchButtonClick),this.detachResultTrackingHandlers(),this.handleInputChange=null,this.handleInputKeydownEnter=null,this.handleInputKeydownEscape=null,this.handleSearchButtonClick=null}async search(e){await this.performSearch(e)}}customElements.get(ie)||customElements.define(ie,O);const Ae=`
/* Modal backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: var(--search-snippet-z-modal);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--search-snippet-transition), visibility var(--search-snippet-transition);
}

.modal-backdrop.open {
  opacity: 1;
  visibility: visible;
}

/* Modal container */
.modal-container {
  position: fixed;
  top: 15%;
  left: 50%;
  transform: translateX(-50%) scale(0.95);
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  background: var(--search-snippet-background);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
  box-shadow: var(--search-snippet-shadow-lg);
  z-index: calc(var(--search-snippet-z-modal) + 1);
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--search-snippet-transition), 
              visibility var(--search-snippet-transition),
              transform var(--search-snippet-transition);
}

.modal-container.open {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) scale(1);
}

/* Modal header with search input */
.modal-header {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-sm);
  padding: var(--search-snippet-spacing-md);
  border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
}

.modal-search-icon {
  width: var(--search-snippet-icon-size);
  height: var(--search-snippet-icon-size);
  color: var(--search-snippet-text-secondary);
  flex-shrink: 0;
}

.modal-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--search-snippet-text-color);
  font-size: var(--search-snippet-font-size-lg);
  font-family: var(--search-snippet-font-family);
  font-weight: var(--search-snippet-font-weight-normal);
  padding: var(--search-snippet-spacing-xs) 0;
}

.modal-search-input::placeholder {
  color: var(--search-snippet-text-secondary);
}

.modal-loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--search-snippet-icon-size);
  height: var(--search-snippet-icon-size);
  flex-shrink: 0;
  visibility: hidden;
}

.modal-loading-indicator .loading {
  width: 16px;
  height: 16px;
}

.modal-container.is-loading .modal-loading-indicator {
  visibility: visible;
}

.modal-shortcut-hint {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-xs);
  color: var(--search-snippet-text-secondary);
  font-size: var(--search-snippet-font-size-sm);
  flex-shrink: 0;
}

.modal-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 var(--search-snippet-spacing-xs);
  background: var(--search-snippet-surface);
  border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  border-radius: 4px;
  font-size: var(--search-snippet-font-size-sm);
  font-family: var(--search-snippet-font-family);
  color: var(--search-snippet-text-secondary);
}

/* Modal content (results area) */
.modal-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--search-snippet-spacing-sm);
}

.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: var(--search-snippet-surface);
}

.modal-content::-webkit-scrollbar-thumb {
  background: var(--search-snippet-border-color);
  border-radius: var(--search-snippet-border-radius);
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: var(--search-snippet-text-secondary);
}

/* Results list */
.modal-results {
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-xs);
}

.result-group {
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-xs);
}

.result-group + .result-group {
  margin-top: var(--search-snippet-spacing-sm);
}

.result-group-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--search-snippet-spacing-xs) var(--search-snippet-spacing-md);
  background: var(--search-snippet-surface);
  color: var(--search-snippet-text-secondary);
  font-size: var(--search-snippet-font-size-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/*
 * Mask the scroll container's top padding while the header is pinned so
 * result items don't peek through as a sliver between the search input and
 * the (sticky) category header. The pseudo-element rides above the header,
 * painted with the modal background, covering the padding gap and giving a
 * clean cutoff for items scrolling underneath.
 */
.result-group-header::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: var(--search-snippet-spacing-sm);
  background: var(--search-snippet-background);
}

.modal-result-row {
  position: relative;
  display: flex;
}


a.modal-result-item {
  flex: 1;
  min-width: 0;
  padding: var(--search-snippet-spacing-md);
  padding-right: calc(
    36px + var(--search-snippet-spacing-md) + var(--search-snippet-spacing-md)
  );
  background: transparent;
  border: var(--search-snippet-border-width) solid transparent;
  border-radius: calc(var(--search-snippet-border-radius) - 4px);
  cursor: pointer;
  transition: var(--search-snippet-transition-fast);
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--search-snippet-spacing-md);
  text-decoration: none;
  color: inherit;
}

/* Image thumbnail container */
.modal-result-image-container {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.modal-result-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity var(--search-snippet-transition);
}

.modal-result-image.loaded {
  opacity: 1;
}

/* Loading shimmer */
.modal-result-image-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    var(--search-snippet-surface) 25%,
    var(--search-snippet-border-color) 50%,
    var(--search-snippet-surface) 75%
  );
  background-size: 200% 100%;
  animation: modal-image-shimmer 1.5s infinite;
}

@keyframes modal-image-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Placeholder icon */
.modal-result-image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--search-snippet-text-secondary);
  opacity: 0.5;
}

.modal-result-image-placeholder svg {
  width: 20px;
  height: 20px;
}

/* Content wrapper */
.modal-result-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-xs);
}

a.modal-result-item:hover,
a.modal-result-item.active {
  background: var(--search-snippet-hover-background);
  border-color: var(--search-snippet-border-color);
}

a.modal-result-item.active {
  border-color: var(--search-snippet-primary-color);
  background: var(--search-snippet-focus-ring);
}

a.modal-result-item:focus-visible {
  outline: 2px solid var(--search-snippet-primary-color);
  outline-offset: -2px;
}

.modal-favorite-button {
  position: absolute;
  top: 50%;
  right: var(--search-snippet-spacing-md);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 8px;
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--search-snippet-text-secondary);
  cursor: pointer;
  transition: var(--search-snippet-transition-fast);
}

.modal-favorite-button:hover,
.modal-favorite-button:focus-visible {
  background: var(--search-snippet-hover-background);
  color: var(--search-snippet-primary-color);
}

.modal-favorite-button:focus-visible {
  outline: 2px solid var(--search-snippet-primary-color);
  outline-offset: -2px;
}

.modal-favorite-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.modal-favorite-button.favorite {
  color: var(--search-snippet-primary-color);
}

.modal-favorite-button.favorite svg {
  fill: currentColor;
}

.modal-result-title {
  font-size: var(--search-snippet-font-size-base);
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-color);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.modal-result-description {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-description);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.modal-result-metadata {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-sm);
  min-width: 0;
}

.modal-result-url {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-primary-color);
  text-decoration: none;
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-result-url-empty {
  visibility: hidden;
}

.modal-result-date {
  font-size: 12px;
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-secondary);
  text-align: right;
  flex-shrink: 0;
}

.modal-result-url:hover {
  text-decoration: underline;
}

/* Initial modal sections */
.modal-initial-section {
  display: flex;
  flex-direction: column;
  gap: var(--search-snippet-spacing-xs);
}

.modal-initial-section + .modal-initial-section {
  margin-top: var(--search-snippet-spacing-md);
}

.modal-initial-section-title {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-xs);
  margin: 0;
  padding: var(--search-snippet-spacing-xs) var(--search-snippet-spacing-md);
  color: var(--search-snippet-text-secondary);
  font-size: var(--search-snippet-font-size-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-initial-section-title svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

/* Result group header */
.modal-group-header {
  padding: var(--search-snippet-spacing-sm) var(--search-snippet-spacing-md);
  font-size: var(--search-snippet-font-size-sm);
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Loading state */
.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--search-snippet-spacing-xxl);
  gap: var(--search-snippet-spacing-md);
  color: var(--search-snippet-text-secondary);
}

/* Empty state */
.modal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--search-snippet-spacing-xxl);
  gap: var(--search-snippet-spacing-md);
  color: var(--search-snippet-text-secondary);
  text-align: center;
}

.modal-empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.modal-empty-title {
  font-size: var(--search-snippet-font-size-base);
  font-weight: var(--search-snippet-font-weight-medium);
  color: var(--search-snippet-text-color);
}

.modal-empty-description {
  font-size: var(--search-snippet-font-size-sm);
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--search-snippet-spacing-sm) var(--search-snippet-spacing-md);
  border-top: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
  background: var(--search-snippet-surface);
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
  border-radius: 0 0 var(--search-snippet-border-radius) var(--search-snippet-border-radius);
}

.modal-footer-hints {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-md);
}

.modal-footer-hint {
  display: flex;
  align-items: center;
  gap: var(--search-snippet-spacing-xs);
}

.modal-footer-hint .modal-kbd {
  min-width: 20px;
  height: 20px;
  font-size: 11px;
}

/* Results count */
.modal-results-count {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
}

/* Powered by in modal footer */
.modal-footer .powered-by-inline {
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-text-secondary);
}

.modal-footer .powered-by-inline a {
  color: var(--search-snippet-text-secondary);
  text-decoration: none;
  transition: color var(--search-snippet-transition-fast);
}

.modal-footer .powered-by-inline a:hover {
  color: var(--search-snippet-primary-color);
}

/* See more link */
.modal-see-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--search-snippet-spacing-xs);
  padding: var(--search-snippet-spacing-md);
  font-size: var(--search-snippet-font-size-sm);
  color: var(--search-snippet-primary-color);
  text-decoration: none;
  font-weight: var(--search-snippet-font-weight-medium);
  transition: background var(--search-snippet-transition-fast);
  padding-bottom: var(--search-snippet-spacing-xs);
}

.modal-see-more:hover {
  background: var(--search-snippet-hover);
  text-decoration: underline;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-container {
    top: 10%;
    width: 95%;
    max-height: 80vh;
  }

  .modal-footer-hints {
    display: none;
  }
}

/* Animation for modal open */
@keyframes modal-slide-in {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}

.modal-container.open {
  animation: modal-slide-in var(--search-snippet-transition) ease-out;
}
`,ne="search-snippet:recent-results",H="search-snippet:favorite-results",Re=5;function Ie(n){if(!n||typeof n!="object")return!1;const i=n;return i.type==="result"&&typeof i.id=="string"&&typeof i.title=="string"&&typeof i.description=="string"&&(i.url===void 0||typeof i.url=="string")&&(i.image===void 0||typeof i.image=="string")&&(i.timestamp===void 0||typeof i.timestamp=="number")&&(i.metadata===void 0||typeof i.metadata=="object"&&i.metadata!==null)}function k(n){return n.url||n.id}function $(n,i){const e=k(i);return n.some(t=>k(t)===e)}function L(n){try{const i=localStorage.getItem(n);if(!i)return[];const e=JSON.parse(i);return Array.isArray(e)?e.filter(Ie):[]}catch{return[]}}function ze(n,i=ne,e=Re){const t=k(n),s=L(i).filter(a=>k(a)!==t),r=[n,...s].slice(0,Math.max(0,e));try{localStorage.setItem(i,JSON.stringify(r))}catch{}return r}function $e(n,i=H){const e=L(i),t=$(e,n)?e.filter(s=>k(s)!==k(n)):[n,...e];try{localStorage.setItem(i,JSON.stringify(t))}catch{}return t}const oe="search-modal-snippet",le=10,ce=50;class he extends HTMLElement{constructor(){super();o(this,"shadow");o(this,"client",null);o(this,"stats",null);o(this,"backdrop",null);o(this,"modal",null);o(this,"inputElement",null);o(this,"resultsContainer",null);o(this,"footerCount",null);o(this,"isOpen",!1);o(this,"results",[]);o(this,"favoriteResults",[]);o(this,"activeIndex",-1);o(this,"debouncedSearch",null);o(this,"currentSearchController",null);o(this,"loadingMessageInterval",null);o(this,"loadingMessageIndex",0);o(this,"translationsOverride",null);o(this,"resolvedTranslations",g(null));o(this,"lastSearchQuery","");o(this,"lastSearchTotal",0);o(this,"handleGlobalKeydown",null);o(this,"handleInputChange",null);o(this,"handleInputKeydown",null);o(this,"handleBackdropClick",null);o(this,"handleResultsContainerClick",null);o(this,"savedBodyStyles",null);o(this,"savedHtmlOverflow",null);this.shadow=this.attachShadow({mode:"open"})}static get observedAttributes(){return["api-url","placeholder","max-results","max-render-results","theme","shortcut","use-meta-key","debounce-ms","hide-branding","show-url","show-date","hide-thumbnails","see-more","disable-analytics","request-options","translations"]}connectedCallback(){this.syncTranslationsFromAttribute(),this.initializeClient(),this.render(),this.attachGlobalKeyboardShortcut(),this.dispatchEvent(x("ready",void 0))}disconnectedCallback(){this.cleanup()}attributeChangedCallback(e,t,s){t!==s&&(e==="api-url"||e==="disable-analytics"?this.initializeClient():e==="theme"?this.updateTheme(s):e==="translations"&&(this.syncTranslationsFromAttribute(),this.isConnected&&this.rerender()))}get translations(){return this.translationsOverride}set translations(e){this.translationsOverride=e??null,this.resolvedTranslations=g(this.translationsOverride),this.isConnected&&this.rerender()}rerender(){const e=this.isOpen,t=this.inputElement?.value??"";this.isOpen=!1,this.render(),e&&(this.isOpen=!0,this.backdrop?.classList.add("open"),this.modal?.classList.add("open"),requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.inputElement?.focus()})})),t&&this.inputElement&&(this.inputElement.value=t,t.trim().length>0&&this.performSearch(t.trim()))}syncTranslationsFromAttribute(){if(this.translationsOverride){this.resolvedTranslations=g(this.translationsOverride);return}const e=T(this.getAttribute("translations"),"SearchModalSnippet");this.resolvedTranslations=g(e)}getProps(){const e=this.resolvedTranslations;return{apiUrl:b(this.getAttribute("api-url"),""),placeholder:b(this.getAttribute("placeholder"),e.placeholder),maxResults:S(this.getAttribute("max-results"),ce),maxRenderResults:S(this.getAttribute("max-render-results"),le),debounceMs:S(this.getAttribute("debounce-ms"),300),theme:b(this.getAttribute("theme"),"auto"),shortcut:b(this.getAttribute("shortcut"),"k"),useMetaKey:this.getAttribute("use-meta-key")!=="false",hideBranding:w(this.getAttribute("hide-branding"),!1),showUrl:w(this.getAttribute("show-url"),!1),showDate:w(this.getAttribute("show-date"),!1),hideThumbnails:w(this.getAttribute("hide-thumbnails"),!1),seeMore:b(this.getAttribute("see-more"),""),groupBy:b(this.getAttribute("group-by"),""),disableAnalytics:w(this.getAttribute("disable-analytics"),!1),translations:this.translationsOverride??void 0}}getRequestOptions(){const e=this.getAttribute("request-options");if(e)try{const t=JSON.parse(e);if(t===null||typeof t!="object"||Array.isArray(t))throw new Error("request-options must be a JSON object");return t}catch(t){console.error("SearchModalSnippet: invalid request-options attribute",t);return}}initializeClient(){const e=this.getProps();if(!e.apiUrl){console.error("SearchModalSnippet: api-url attribute is required"),this.client=null,this.destroyStatsClient(),this.showMissingApiUrlError();return}try{this.client=A(e.apiUrl),this.destroyStatsClient(),e.disableAnalytics||(this.stats=new q(e.apiUrl))}catch(t){console.error("SearchModalSnippet:",t)}}destroyStatsClient(){this.stats&&(this.stats.destroy(),this.stats=null)}render(){const e=this.getProps(),t=this.resolvedTranslations,s=h=>this.performSearch(h);this.debouncedSearch=N(s,e.debounceMs||300);const r=document.createElement("style");r.textContent=`${I}
${Ae}`;const a=e.hideBranding?"":`<div class="powered-by-inline">${R}</div>`,l=document.createElement("div");l.innerHTML=`
      <div class="modal-backdrop" role="presentation"></div>
      <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <svg class="modal-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
          </svg>
          <input
            type="text"
            class="modal-search-input"
            placeholder="${c(e.placeholder||t.placeholder)}"
            aria-label="${c(t.searchButtonLabel)}"
            aria-autocomplete="list"
            aria-controls="modal-results-list"
            aria-expanded="false"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="modal-loading-indicator" role="status" aria-label="${c(t.loadingAriaLabel)}">
            <span class="loading" aria-hidden="true"></span>
          </span>
        </div>
        <div class="modal-content">
          <div class="modal-results" id="modal-results-list" role="listbox" aria-label="${c(t.searchResultsAriaLabel)}"></div>
        </div>
        <div class="modal-footer">
          <div class="modal-footer-hints">
            <div class="modal-footer-hint">
              <kbd class="modal-kbd">↑</kbd>
              <kbd class="modal-kbd">↓</kbd>
              <span>${c(t.navigateHint)}</span>
            </div>
            <div class="modal-footer-hint">
              <kbd class="modal-kbd">↵</kbd>
              <span>${c(t.selectHint)}</span>
            </div>
            <div class="modal-footer-hint">
              <kbd class="modal-kbd">Esc</kbd>
              <span>${c(t.closeHint)}</span>
            </div>
          </div>
          ${a}
        </div>
      </div>
    `,this.shadow.innerHTML="",this.shadow.appendChild(r),this.shadow.appendChild(l),this.backdrop=this.shadow.querySelector(".modal-backdrop"),this.modal=this.shadow.querySelector(".modal-container"),this.inputElement=this.shadow.querySelector(".modal-search-input"),this.resultsContainer=this.shadow.querySelector(".modal-results"),this.footerCount=this.shadow.querySelector(".modal-results-count"),this.attachEventListeners(),this.client?this.showEmptyState():this.showMissingApiUrlError()}attachGlobalKeyboardShortcut(){const e=this.getProps(),t=e.shortcut?.toLowerCase()||"k";this.handleGlobalKeydown=s=>{(e.useMetaKey&&s.metaKey||s.ctrlKey)&&s.key.toLowerCase()===t&&!this.isOpen&&(s.preventDefault(),this.open())},document.addEventListener("keydown",this.handleGlobalKeydown)}attachEventListeners(){!this.inputElement||!this.backdrop||(this.handleInputChange=e=>{const s=e.target.value.trim();s.length>0&&this.debouncedSearch?this.debouncedSearch(s):(this.debouncedSearch?.cancel(),this.currentSearchController?.abort(),this.results=[],this.activeIndex=-1,this.showEmptyState())},this.inputElement.addEventListener("input",this.handleInputChange),this.handleInputKeydown=e=>{switch(e.key){case"ArrowDown":e.preventDefault(),this.navigateResults(1);break;case"ArrowUp":e.preventDefault(),this.navigateResults(-1);break;case"Enter":e.preventDefault(),this.selectActiveResult();break;case"Escape":e.preventDefault(),this.close();break}},this.inputElement.addEventListener("keydown",this.handleInputKeydown),this.handleBackdropClick=e=>{e.target===this.backdrop&&this.close()},this.backdrop.addEventListener("click",this.handleBackdropClick))}navigateResults(e){if(this.results.length===0)return;const t=this.activeIndex+e;t<0?this.activeIndex=this.results.length-1:t>=this.results.length?this.activeIndex=0:this.activeIndex=t,this.updateActiveResult()}updateActiveResult(){const e=this.resultsContainer?.querySelectorAll(".modal-result-item");e&&(e.forEach((t,s)=>{s===this.activeIndex?(t.classList.add("active"),t.setAttribute("aria-selected","true"),t.scrollIntoView({block:"nearest"})):(t.classList.remove("active"),t.setAttribute("aria-selected","false"))}),this.inputElement&&this.activeIndex>=0?this.inputElement.setAttribute("aria-activedescendant",`result-${this.activeIndex}`):this.inputElement&&this.inputElement.removeAttribute("aria-activedescendant"))}selectActiveResult(){if(this.currentSearchController)return;if(this.activeIndex<0||this.activeIndex>=this.results.length){const s=this.inputElement?.value.trim();s&&s.length>0&&this.performSearch(s);return}const e=this.results[this.activeIndex];this.dispatchEvent(x("result-select",{result:e,index:this.activeIndex}));const t=this.resultsContainer?.querySelector(`.modal-result-item[data-index="${this.activeIndex}"]`);t&&z(e.url)&&t.click(),this.close()}async performSearch(e){if(!this.client){this.showMissingApiUrlError();return}this.currentSearchController&&(this.currentSearchController.abort(),this.currentSearchController=null);const t=new AbortController;this.currentSearchController=t,this.showLoadingState();try{const s=this.getProps(),r=await this.client.search(e,{signal:t.signal,maxResults:s.maxResults||ce,request:this.getRequestOptions()});if(t.signal.aborted||this.currentSearchController!==t)return;const a=r.slice(0,s.maxRenderResults||le);this.lastSearchQuery=e,this.lastSearchTotal=r.length,this.stats?.trackSearch(e,r.length),this.displayResults(a,e,r.length)}catch(s){if(s.name==="AbortError"||t.signal.aborted||this.currentSearchController!==t)return;this.showErrorState(s.message)}finally{this.currentSearchController===t&&(this.currentSearchController=null)}}displayResults(e,t,s=e.length){const r=this.getProps(),a=this.resolvedTranslations,l=r.groupBy?V(e,r.groupBy,a.groupOther):null;if(this.results=l?l.flatMap(m=>m.results):e,this.favoriteResults=L(H),this.activeIndex=this.results.length>0?0:-1,this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;if(this.results.length===0){this.showNoResultsState(t);return}const h=l?K(l,(m,f)=>this.renderResult(m,f)):this.results.map((m,f)=>this.renderResult(m,f)).join(""),d=s>e.length,u=d?C(a.resultsCountOverflow,{n:e.length,total:s}):C(s===1?a.modalResultsCount:a.modalResultsCountPlural,{n:s}),p=r.seeMore&&d?`<a href="${c(r.seeMore+encodeURIComponent(t))}" class="modal-see-more">
            <span>${c(a.seeMoreResults)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>`:"";this.resultsContainer.innerHTML=h+p,this.footerCount&&(this.footerCount.textContent=u),this.inputElement&&this.inputElement.setAttribute("aria-expanded","true"),this.attachResultHandlers(),this.updateActiveResult()}renderResult(e,t){const s=this.getProps(),r=j(e.metadata?.icon),a=s.hideThumbnails?"":this.renderResultImage(e.image,e.title),l=z(e.url),h=l?c(l):"#",d=l?c(U(l)):"",u=s.showDate&&e.timestamp!==void 0?`<div class="modal-result-date">${c(P(e.timestamp))}</div>`:"",p=s.showUrl&&l||u?`<div class="modal-result-metadata">
            ${s.showUrl&&l?`<span class="modal-result-url">${d}</span>`:'<span class="modal-result-url modal-result-url-empty"></span>'}
            ${u}
          </div>`:"",m=$(this.favoriteResults,e),f=m?this.resolvedTranslations.removeFavorite:this.resolvedTranslations.addFavorite;return`
      <div class="modal-result-row">
        <a
          href="${h}"
          class="modal-result-item${t===this.activeIndex?" active":""}"
          role="option"
          id="result-${t}"
          aria-selected="${t===this.activeIndex}"
          tabindex="-1"
          data-index="${t}"
          data-result-id="${c(e.id||"")}"
          data-url="${c(l)}"
        >
          ${r}
          ${a}
          <div class="modal-result-content">
            <div class="modal-result-title">${c(e.title||"")}</div>
            ${e.description?`<div class="modal-result-description">${c(e.description)}</div>`:""}
            ${p}
          </div>
        </a>
        <button
          type="button"
          class="modal-favorite-button${m?" favorite":""}"
          data-favorite-index="${t}"
          aria-label="${c(f)}"
          title="${c(f)}"
          aria-pressed="${m}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2.7 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.3l6.2-.9L12 2.7Z"></path>
          </svg>
        </button>
      </div>
    `}renderResultImage(e,t){const s='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';return e?`
      <div class="modal-result-image-container">
        <div class="modal-result-image-loading"></div>
        <div class="modal-result-image-placeholder" style="display: none;">${s}</div>
        <img 
          class="modal-result-image" 
          src="${c(e)}" 
          alt="${c(t)}"
          loading="lazy"
        />
      </div>
    `:`
        <div class="modal-result-image-container">
          <div class="modal-result-image-placeholder">${s}</div>
        </div>
      `}attachResultHandlers(){this.detachResultsContainerClick();const e=this.resultsContainer;if(!e)return;this.handleResultsContainerClick=r=>{const a=r.target;if(!a)return;const l=a.closest(".modal-favorite-button");if(l){const u=Number.parseInt(l.dataset.favoriteIndex??"",10),p=this.results[u];if(!Number.isNaN(u)&&p)if(this.favoriteResults=$e(p),this.inputElement?.value.trim()){const m=$(this.favoriteResults,p),f=m?this.resolvedTranslations.removeFavorite:this.resolvedTranslations.addFavorite;l.classList.toggle("favorite",m),l.setAttribute("aria-pressed",String(m)),l.setAttribute("aria-label",f),l.title=f}else this.showEmptyState();return}const h=a.closest(".modal-result-item");if(h){h.getAttribute("href")==="#"&&r.preventDefault();const p=h.getAttribute("data-index"),m=h.getAttribute("data-result-id")??"",f=p!==null?Number.parseInt(p,10):Number.NaN;if(!Number.isNaN(f)){const de=this.results[f];de&&ze(de),m&&this.stats?.trackClick(this.lastSearchQuery,this.lastSearchTotal,m,f)}return}a.closest(".modal-see-more")&&this.stats?.trackViewMore(this.lastSearchQuery,this.lastSearchTotal)},e.addEventListener("click",this.handleResultsContainerClick),e.querySelectorAll(".modal-result-item").forEach((r,a)=>{r.addEventListener("mouseenter",()=>{this.activeIndex=a,this.updateActiveResult()})}),e.querySelectorAll(".modal-result-image").forEach(r=>{r.addEventListener("load",()=>{r.classList.add("loaded"),r.closest(".modal-result-image-container")?.querySelector(".modal-result-image-loading")?.remove()}),r.addEventListener("error",()=>{const a=r.closest(".modal-result-image-container");a?.querySelector(".modal-result-image-loading")?.remove();const l=a?.querySelector(".modal-result-image-placeholder");l&&(l.style.display="flex"),r.style.display="none"})})}detachResultsContainerClick(){this.resultsContainer&&this.handleResultsContainerClick&&this.resultsContainer.removeEventListener("click",this.handleResultsContainerClick),this.handleResultsContainerClick=null}renderEmptyState(){const e=this.resolvedTranslations;return`
      <div class="modal-empty">
        <svg class="modal-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div class="modal-empty-description">${c(e.modalEmptyStateDescription)}</div>
      </div>
    `}renderInitialSection(e,t,s,r,a){return e.length===0?"":`
      <section class="modal-initial-section" aria-labelledby="${s}">
        <h2 class="modal-initial-section-title" id="${s}">
          ${a==="favorite"?`<svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2.7 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.3l6.2-.9L12 2.7Z"></path>
          </svg>`:`<svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M12 7v5l4 2"></path>
          </svg>`}
          <span>${c(t)}</span>
        </h2>
        ${e.map((h,d)=>this.renderResult(h,r+d)).join("")}
      </section>
    `}showEmptyState(){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;this.favoriteResults=L(H);const e=L(ne).filter(t=>!$(this.favoriteResults,t));this.results=[...this.favoriteResults,...e],this.activeIndex=this.results.length>0?0:-1,this.resultsContainer.innerHTML=this.results.length>0?`${this.renderInitialSection(this.favoriteResults,this.resolvedTranslations.favoriteResults,"modal-favorite-results-title",0,"favorite")}${this.renderInitialSection(e,this.resolvedTranslations.recentResults,"modal-recent-results-title",this.favoriteResults.length,"recent")}`:this.renderEmptyState(),this.attachResultHandlers(),this.updateActiveResult(),this.footerCount&&(this.footerCount.textContent=""),this.inputElement&&this.inputElement.setAttribute("aria-expanded",String(this.results.length>0))}showLoadingState(){if(!this.resultsContainer)return;this.clearLoadingInterval(),this.setLoadingIndicator(!0);const e=this.resolvedTranslations.loadingMessages;this.loadingMessageIndex=Math.floor(Math.random()*e.length),this.resultsContainer.querySelector(".modal-result-item")||(this.resultsContainer.innerHTML=`
        <div class="modal-loading">
          <div class="loading-text loading-text-animate">${c(e[this.loadingMessageIndex])}</div>
        </div>
      `),this.footerCount&&(this.footerCount.textContent=e[this.loadingMessageIndex]),this.startLoadingInterval()}setLoadingIndicator(e){this.modal?.classList.toggle("is-loading",e),this.inputElement?.setAttribute("aria-busy",String(e)),this.resultsContainer?.setAttribute("aria-busy",String(e))}startLoadingInterval(){this.loadingMessageInterval=setInterval(()=>{const e=this.resolvedTranslations.loadingMessages;this.loadingMessageIndex=(this.loadingMessageIndex+1)%e.length;const t=this.resultsContainer?.querySelector(".loading-text");t&&(t.classList.remove("loading-text-animate"),t.offsetWidth,t.textContent=e[this.loadingMessageIndex],t.classList.add("loading-text-animate")),this.footerCount&&(this.footerCount.textContent=e[this.loadingMessageIndex])},B)}clearLoadingInterval(){this.loadingMessageInterval&&(clearInterval(this.loadingMessageInterval),this.loadingMessageInterval=null)}showNoResultsState(e){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;const t=this.resolvedTranslations;this.resultsContainer.innerHTML=`
      <div class="modal-empty">
        <svg class="modal-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <div class="modal-empty-title">${c(t.modalNoResultsTitle)}</div>
        <div class="modal-empty-description">${c(C(t.modalNoResultsDescription,{query:e}))}</div>
      </div>
    `,this.footerCount&&(this.footerCount.textContent=t.modalResultsCountZero),this.inputElement&&this.inputElement.setAttribute("aria-expanded","false")}showErrorState(e){if(this.clearLoadingInterval(),this.setLoadingIndicator(!1),!this.resultsContainer)return;const t=this.resolvedTranslations;this.resultsContainer.innerHTML=`
      <div class="error">
        <strong>${c(t.errorPrefix)}</strong> ${c(e)}
      </div>
    `,this.footerCount&&(this.footerCount.textContent=t.modalResultsCountError)}showMissingApiUrlError(){this.resultsContainer&&this.showErrorState(this.resolvedTranslations.missingApiUrlError)}updateTheme(e){const t=e==="light"||e==="dark"||e==="auto"?e:"auto";t==="auto"?this.removeAttribute("theme"):this.setAttribute("theme",t)}lockBodyScroll(){const e=window.scrollY;this.savedBodyStyles={overflow:document.body.style.overflow,position:document.body.style.position,top:document.body.style.top,width:document.body.style.width,scrollbarGutter:document.body.style.scrollbarGutter},this.savedHtmlOverflow=document.documentElement.style.overflow,document.body.style.scrollbarGutter="stable",document.documentElement.style.overflow="hidden",document.body.style.overflow="hidden",document.body.style.position="fixed",document.body.style.top=`-${e}px`,document.body.style.width="100%"}unlockBodyScroll(){if(!this.savedBodyStyles)return;const e=Math.abs(Number.parseInt(document.body.style.top||"0",10));document.documentElement.style.overflow=this.savedHtmlOverflow||"",document.body.style.overflow=this.savedBodyStyles.overflow,document.body.style.position=this.savedBodyStyles.position,document.body.style.top=this.savedBodyStyles.top,document.body.style.width=this.savedBodyStyles.width,document.body.style.scrollbarGutter=this.savedBodyStyles.scrollbarGutter||"",window.scrollTo(0,e),this.savedBodyStyles=null,this.savedHtmlOverflow=null}cleanup(){this.clearLoadingInterval(),this.currentSearchController&&(this.currentSearchController.abort(),this.currentSearchController=null),this.handleGlobalKeydown&&(document.removeEventListener("keydown",this.handleGlobalKeydown),this.handleGlobalKeydown=null),this.inputElement&&(this.handleInputChange&&this.inputElement.removeEventListener("input",this.handleInputChange),this.handleInputKeydown&&this.inputElement.removeEventListener("keydown",this.handleInputKeydown)),this.backdrop&&this.handleBackdropClick&&this.backdrop.removeEventListener("click",this.handleBackdropClick),this.detachResultsContainerClick(),this.handleInputChange=null,this.handleInputKeydown=null,this.handleBackdropClick=null,this.destroyStatsClient(),this.client&&this.client.cancelAllRequests()}open(){this.isOpen||(this.isOpen=!0,this.backdrop?.classList.add("open"),this.modal?.classList.add("open"),requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.inputElement?.focus()})}),this.lockBodyScroll(),this.dispatchEvent(x("open",void 0)))}close(){this.isOpen&&(this.debouncedSearch?.cancel(),this.currentSearchController?.abort(),this.currentSearchController=null,this.isOpen=!1,this.backdrop?.classList.remove("open"),this.modal?.classList.remove("open"),this.inputElement&&(this.inputElement.value=""),this.results=[],this.activeIndex=-1,this.showEmptyState(),this.unlockBodyScroll(),this.dispatchEvent(x("close",void 0)))}toggle(){this.isOpen?this.close():this.open()}async search(e){this.isOpen||this.open(),this.inputElement&&(this.inputElement.value=e),await this.performSearch(e)}getResults(){return[...this.results]}isModalOpen(){return this.isOpen}}customElements.get(oe)||customElements.define(oe,he),v.AISearchClient=G,v.ChatBubbleSnippet=X,v.ChatPageSnippet=se,v.DEFAULT_TRANSLATIONS=y,v.SearchBarSnippet=O,v.SearchModalSnippet=he,v.StatsClient=q,v.default=O,v.mergeTranslations=g,Object.defineProperties(v,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}})}));
//# sourceMappingURL=search-snippet.umd.js.map
