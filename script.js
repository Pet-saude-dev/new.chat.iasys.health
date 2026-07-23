function openDrawer() {
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('open');
}

async function enterChat(prefillMsg) {
  document.getElementById('home-screen').classList.add('hidden');
  document.getElementById('chat-area').classList.remove('hidden');
  await window.ensureChatStarted();
  if (prefillMsg) {
    const input = document.getElementById('message-input');
    input.value = prefillMsg;
    document.getElementById('message-form').requestSubmit();
  }
}

document.getElementById('home-send-btn').addEventListener('click', () => {
  const val = document.getElementById('home-input').value.trim();
  if (val) enterChat(val);
});

document.getElementById('home-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) enterChat(val);
  }
});

enterChat();