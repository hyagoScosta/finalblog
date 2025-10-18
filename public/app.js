// ---------- Reveal on scroll
const ioReveal = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); ioReveal.unobserve(e.target); } });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=> ioReveal.observe(el));

// ---------- Chat (LocalStorage + Socket.IO)
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const usernameEl = document.getElementById('username');
const userLabel = document.getElementById('userLabel');

const LS_USER_KEY = 'chat_username';
const LS_HISTORY_KEY = 'chat_history_v1';
const uid = crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);

// carrega usuário
const storedName = localStorage.getItem(LS_USER_KEY) || '';
if (storedName) { usernameEl.value = storedName; userLabel.textContent = '@' + storedName; }
usernameEl.addEventListener('input', ()=>{
  localStorage.setItem(LS_USER_KEY, usernameEl.value.trim());
  userLabel.textContent = '@' + (usernameEl.value.trim() || 'visitante');
});

// helpers localstorage
function loadLocalHistory(){
  try{
    const arr = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveLocalHistory(list){
  try{
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(list.slice(-500)));
  }catch{}
}
function appendLocal(msg){
  const list = loadLocalHistory();
  list.push(msg);
  saveLocalHistory(list);
}

// render de messages
function addMessage({text, author, self, t}){
  const div = document.createElement('div');
  div.className = 'msg ' + (self ? 'you' : 'other');
  const time = t ? new Date(t) : new Date();
  const hh = String(time.getHours()).padStart(2,'0');
  const mm = String(time.getMinutes()).padStart(2,'0');
  div.innerHTML = `<strong>${author || 'visitante'}</strong> <small style="opacity:.7">• ${hh}:${mm}</small><br>${escapeHtml(text)}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function escapeHtml(str=''){
  return String(str).replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

// carrega histórico local na UI
loadLocalHistory().forEach(m => addMessage({text:m.text, author:m.author, self:m.uid===uid, t:m.t}));

// conecta ao servidor Socket.IO
const socket = io(); // mesmo host/porta

// recebe histórico do servidor (últimas 100)
socket.on('chat:history', (list=[])=>{
  // mescla gentilmente: adiciona os que ainda não existem localmente
  const local = loadLocalHistory();
  const knownIds = new Set(local.map(m => m.id).filter(Boolean));
  list.forEach(msg => {
    if (!knownIds.has(msg.id)) {
      appendLocal(msg);
      addMessage({text:msg.text, author:msg.author, self:false, t:msg.t});
    }
  });
});

// novas mensagens vindas do servidor
socket.on('chat:new', (msg)=>{
  appendLocal(msg);
  addMessage({text:msg.text, author:msg.author, self:false, t:msg.t});
});

// enviar
function send(){
  const text = inputEl.value.trim();
  if(!text) return;
  const author = usernameEl.value.trim() || 'visitante';
  const msg = { id: crypto?.randomUUID?.() ?? String(Math.random()).slice(2), uid, author, text, t: Date.now() };

  // eco local + persistência local
  appendLocal(msg);
  addMessage({text, author:'Você', self:true, t:msg.t});

  // envia ao servidor
  socket.emit('chat:send', { text, author });

  inputEl.value = '';
}
sendBtn.addEventListener('click', send);
inputEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ send(); }});
