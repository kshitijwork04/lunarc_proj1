document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');

  // Maintain conversation history
  let history = [];

  // Create typing indicator element
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = 'Thinking<span></span><span></span><span></span>';
  chatMessages.appendChild(typingIndicator);

  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (role === 'model' || role === 'bot') {
      // Parse markdown to HTML and sanitize
      const rawHtml = marked.parse(text);
      contentDiv.innerHTML = DOMPurify.sanitize(rawHtml);
    } else {
      contentDiv.textContent = text;
    }
    
    msgDiv.appendChild(contentDiv);
    
    // Insert before typing indicator
    chatMessages.insertBefore(msgDiv, typingIndicator);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    typingIndicator.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    typingIndicator.style.display = 'none';
  }

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    
    // Append to UI
    appendMessage('user', text);
    
    // Append to history
    history.push({ role: 'user', text });
    
    showTyping();
    chatInput.disabled = true;
    sendButton.disabled = true;

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history })
      });

      const data = await res.json();
      
      if (res.ok && data.response) {
        history.push({ role: 'model', text: data.response });
        appendMessage('model', data.response);
      } else {
        appendMessage('model', "Sorry, I encountered an error. Please try again.");
      }
    } catch (err) {
      console.error(err);
      appendMessage('model', "Connection error. Make sure the server is running.");
    } finally {
      hideTyping();
      chatInput.disabled = false;
      sendButton.disabled = false;
      chatInput.focus();
    }
  }

  sendButton.addEventListener('click', handleSend);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
});
