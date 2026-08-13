const API_URL = 'https://chatbot-llama-saude-j6xd.onrender.com/chat';
const sessionId = crypto.randomUUID();

const agentConfig = {
  1: { title: 'Orientações', sub: 'Dúvidas e orientações de saúde' },
  2: { title: 'Agendamentos', sub: 'Agende consultas e exames' },
  3: { title: 'Histórico', sub: 'Seu histórico de atendimentos' },
  4: { title: 'Notificações', sub: 'Avisos e lembretes do SUS' },
  5: { title: 'Menu', sub: 'Menu principal de serviços' },
};

// Mensagem que cada botão envia automaticamente ao ser clicado
// null = apenas abre o chat sem enviar nada (mostra o menu normalmente)
const agentDirectMessage = {
  1: '1',    // Orientações rápidas
  2: '5',    // Agendar consulta
  3: null,   // Histórico – sem ação por enquanto
  4: null,   // Notificações – sem ação por enquanto
  5: null,   // Menu – apenas abre o chat com o menu
};

function getAgentFromURL() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('agent'));
  return agentConfig[id] ? id : 5;
}

let activeAgentId = getAgentFromURL();
let hasStarted = false;

function updateHomeGreeting(html) {
  const match = html.match(/Olá,?\s*<strong>(.*?)<\/strong>/i);
  if (match) {
    const nome = match[1].split(' ')[0];
    document.getElementById('home-greeting').innerHTML =
      `Olá, <span style="color:#0056b3">${nome}</span>!<br>No que posso te ajudar hoje?`;
  }
}

function fetchGreeting(agentId) {
  const config = agentConfig[agentId] || agentConfig[5];
  document.getElementById('chat-title').textContent = config.title;
  document.getElementById('chat-sub').textContent = config.sub;
  document.title = `IASYS · ${config.title}`;

  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '__init__',
      sessionId: sessionId,
      agentId: agentId,
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error(response.statusText);
      return response.json();
    })
    .then((data) => {
      if (data.replies.length > 0) updateHomeGreeting(processMarkdown(data.replies[0]));
      return data.replies;
    })
    .catch((error) => {
      console.error('Erro ao buscar saudação:', error);
      return ['Olá! Sou o <strong>IASYS</strong>, assistente virtual do SUS. Como posso te ajudar?'];
    });
}

let greetingPromise = fetchGreeting(activeAgentId);

async function initChat(agentId) {
  document.querySelectorAll('.agent-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.agent) === agentId);
  });

  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '';
  addTimeDivider('Hoje');

  const typingEl = showTyping();
  const replies = await fetchGreeting(agentId);
  removeTyping(typingEl);

  replies.forEach((reply) => {
    addMessage('bot', processMarkdown(reply));
  });

  const directMsg = agentDirectMessage[agentId];
  if (directMsg) {
    await sendMessage(directMsg, false); // false = não exibe a mensagem do usuário
  }
}

async function ensureChatStarted() {
  if (hasStarted) return;
  hasStarted = true;

  document.querySelectorAll('.agent-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.agent) === activeAgentId);
  });

  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '';
  addTimeDivider('Hoje');

  const typingEl = showTyping();
  const replies = await greetingPromise;
  removeTyping(typingEl);

  replies.forEach((reply) => {
    addMessage('bot', processMarkdown(reply));
  });
}
window.ensureChatStarted = ensureChatStarted;

// ── Função central de envio de mensagem ──
async function sendMessage(text, showUserBubble = true) {
  if (showUserBubble) addMessage('user', text);

  const typingEl = showTyping();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId: sessionId,
        agentId: activeAgentId,
      }),
    });

    removeTyping(typingEl);

    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    data.replies.forEach((reply) => {
      addMessage('bot', processMarkdown(reply));
    });
  } catch (error) {
    removeTyping(typingEl);
    console.error('Erro:', error);
    addMessage('bot', 'Desculpe, não consegui me conectar ao servidor. Tente novamente mais tarde.');
  }
}

document.querySelectorAll('.agent-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const newAgentId = parseInt(btn.dataset.agent);
    if (newAgentId === activeAgentId && hasStarted) return;

    activeAgentId = newAgentId;
    hasStarted = true;

    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('chat-area').classList.remove('hidden');

    const newURL = `${window.location.pathname}?agent=${newAgentId}`;
    history.pushState({ agent: newAgentId }, '', newURL);

    initChat(newAgentId);
    closeDrawer();
  });
});

window.addEventListener('popstate', () => {
  activeAgentId = getAgentFromURL();
  hasStarted = true;
  initChat(activeAgentId);
});

document.getElementById('message-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendMessage(text, true);
});

function addTimeDivider(label) {
  const div = document.createElement('div');
  div.className = 'time-divider';
  div.textContent = label;
  document.getElementById('chat-messages').appendChild(div);
}

function addMessage(sender, html) {
  const isBot = sender === 'bot';
  const chatMessages = document.getElementById('chat-messages');

  const row = document.createElement('div');
  row.classList.add('msg-row');
  if (!isBot) row.classList.add('user');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar', isBot ? 'bot-avatar' : 'user-avatar');

  const col = document.createElement('div');
  col.classList.add('msg-col');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', isBot ? 'bot-bubble' : 'user-bubble');
  if (isBot) {
    bubble.innerHTML = html;
  } else {
    bubble.textContent = html;
  }

  col.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(col);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  const chatMessages = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.classList.add('msg-row');
  row.id = 'typing-row';

  const avatar = document.createElement('div');
  avatar.classList.add('avatar', 'bot-avatar');

  const col = document.createElement('div');
  col.classList.add('msg-col');

  const bubble = document.createElement('div');
  bubble.classList.add('typing-bubble');
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  col.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(col);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return row;
}

function removeTyping(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function processMarkdown(text) {
  let t = text;
  t = t.replace(/(https?:\/\/[^\s\n]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
  t = t.replace(/\n/g, '<br>');
  return t;
}