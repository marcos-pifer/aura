// Sidebar
const sidebar = document.getElementById('aura-sidebar');
const toggleBtn = document.getElementById('toggle-btn');
const icon = document.getElementById('sidebar-icon');

// Upload
const uploadBtn = document.getElementById('upload-btn');
const noFileLink = document.getElementById('create-without-audio');
const sidebarContent = document.querySelector('.sidebar-content');
const throbberContainer = document.getElementById('throbber-container');

// Settings
const settingsBtn = document.getElementById('settings-btn');
const modal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const errorMsg = document.getElementById('settings-error-msg');

// Setting inputs
const apiKeyInput = document.getElementById('api-key');
const toggleApiKeyBtn = document.getElementById('toggle-api-key');
const apiUrlInput = document.getElementById('api-url');
const apiTempInput = document.getElementById('api-temp');
const apiTokensInput = document.getElementById('api-tokens');
const testConnectionBtn = document.getElementById('test-connection-btn');

// Drag n' drop
const dragOverlay = document.getElementById('drag-overlay');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Delete entries
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
let sessionToDeleteId = null;

// Main area
const workArea = document.querySelector('.work-area');
const homeViewHTML = workArea?.innerHTML;
let currentSessionId = null;
let currentIdeaIndex = 0;

// Startup
const startupOverlay = document.getElementById('startup-overlay');
const serverLogs = document.getElementById('server-logs');
const mainContainer = document.getElementById('aura-main');
const statusText = document.querySelector('.status-text');

// Prompt (RAG)
const promptInput = document.querySelector('.prompt-input');
const sendBtn = document.querySelector('.prompt-send-btn');

const ctxMenu = document.createElement('div');
ctxMenu.id = 'custom-context-menu';
ctxMenu.innerHTML = `
  <div class="ctx-menu-item" data-action="Augment"><span class="material-symbols-outlined">add_circle</span> Augment</div>
  <div class="ctx-menu-item" data-action="Explain"><span class="material-symbols-outlined">help</span> Explain</div>
  <div class="ctx-menu-item" data-action="Simplify"><span class="material-symbols-outlined">compress</span> Simplify</div>
  <div class="ctx-menu-item" data-action="Verify"><span class="material-symbols-outlined">fact_check</span> Verify</div>
`;
document.body.appendChild(ctxMenu);

// Hide menu on any click outside
document.addEventListener('click', (e) => {
    if (!ctxMenu.contains(e.target)) {
        ctxMenu.style.display = 'none';
    }
});

window.electronAPI.onServerLog((message) => {
  if (serverLogs) {
    const line = document.createElement('div');
    line.className = 'log-line';
    
    let cleanMessage = message.replace('[System]:', '').replace('[Error]:', 'ERR >');
    if (!cleanMessage.startsWith('ERR >') && !cleanMessage.startsWith('>')) {
        cleanMessage = `> ${cleanMessage}`;
    }
    
    line.innerText = cleanMessage;
    if (message.includes('[Error]')) line.style.color = '#ff6b6b';
    
    serverLogs.appendChild(line);
    line.scrollIntoView({ behavior: "smooth", block: "end" });
  }
});

window.electronAPI.onServerStatus((message) => {
    if (statusText) {
        statusText.innerText = message;
        statusText.style.opacity = '0.5';

        setTimeout(() => statusText.style.opacity = '1', 100);
    }
});

window.electronAPI.onServerReady(() => {
  if (!startupOverlay) return;

  startupOverlay.classList.add('fade-out');
  mainContainer.classList.remove('hidden');
  
  setTimeout(() => {
    startupOverlay.style.display = 'none';
    serverLogs.innerHTML = '';
  }, 500);
});

toggleBtn?.addEventListener('click', () => {
  if (!sidebar || !icon) return;

  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  icon.textContent = (isCollapsed) ? "menu" : "chevron_left";
});

noFileLink?.addEventListener('click', () => {
  createSession();
});

settingsBtn?.addEventListener('click', async () => {
  if (!modal || !errorMsg) return;

  const settings = await window.electronAPI.getSettings();
  
  if (settings) {
    if (settings.url) apiUrlInput.value = settings.url;
    if (settings.key) apiKeyInput.value = settings.key;

    apiTempInput.value = settings.temperature ?? 0.7;
    apiTokensInput.value = settings.maxTokens ?? 1024;
  }

  modal.classList.remove('hidden');
  errorMsg.classList.add('hidden');
});

toggleApiKeyBtn?.addEventListener('click', () => {
  const currentType = apiKeyInput.getAttribute('type');
  
  if (currentType === 'password') {
    apiKeyInput.setAttribute('type', 'text');
    toggleApiKeyBtn.innerText = 'visibility_off';
  } else {
    apiKeyInput.setAttribute('type', 'password');
    toggleApiKeyBtn.innerText = 'visibility';
  }
});

closeModal?.addEventListener('click', () => {
  if (!modal) return;
  modal.classList.add('hidden');
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();

  dragOverlay?.classList.remove('hidden');
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (e.clientX === 0 || e.clientY === 0) dragOverlay?.classList.add('hidden');
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();

  dragOverlay?.classList.add('hidden');

  if (e.dataTransfer?.files.length > 0) {
    const file = e.dataTransfer.files[0];

    const filePath = window.electronAPI.getPathForFile(file);

    if (file.name.toLowerCase().endsWith('.mp3')) {
      createSession(filePath);
    } else {
      showToast("Only .mp3 files are supported.");
    }
  }
});

saveSettingsBtn?.addEventListener('click', async () => {
  const url = apiUrlInput.value.trim();
  const key = apiKeyInput.value.trim();
  const temp = apiTempInput.value.trim();
  const tokens = apiTokensInput.value.trim();

  const settings = {
    url: url,
    key: key,
    temperature: parseFloat(temp) || 0.7,
    maxTokens: parseInt(tokens) || 1024
  };

  await window.electronAPI.saveSettings(settings);
  
  errorMsg?.classList.add('hidden');
  modal?.classList.add('hidden');
  showToast("Settings saved.", 'success');
});

testConnectionBtn?.addEventListener('click', async () => {
    const settings = {
      url: apiUrlInput.value.trim(),
      key: apiKeyInput.value.trim(),
      temperature: parseFloat(apiTempInput.value) || 0.7,
      maxTokens: parseInt(apiTokensInput.value) || 1024
    };

    if (!settings.key) {
        showToast("Please enter an API Key to test.");
        return;
    }

    testConnectionBtn.innerText = "...";
    const result = await window.electronAPI.testConnection(settings);
    
    testConnectionBtn.innerText = "Test";
    showToast(result.message, result.result);
});

cancelDeleteBtn?.addEventListener('click', () => {
  deleteModal?.classList.add('hidden');
  sessionToDeleteId = null;
});

confirmDeleteBtn?.addEventListener('click', async () => {
  if (sessionToDeleteId) {
    const success = await window.electronAPI.deleteSession(sessionToDeleteId);
    if (success) {
      const sidebarItem = document.getElementById(`sidebar-session-${sessionToDeleteId}`);
      if (sidebarItem) {
        sidebarItem.remove();
      }

      if (currentSessionId === sessionToDeleteId) {
        loadHomeView();
      }
    } else {
      showToast("Error deleting file.");
    }
  }
  
  deleteModal?.classList.add('hidden');
  sessionToDeleteId = null;
});

deleteModal?.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.add('hidden');
    sessionToDeleteId = null;
  }
});

const createSession = (filePath = null) => {
    const sessionData = {
        id: Date.now(),
        title: filePath ? "Audio Capture" : "Untitled Session",
        summary: "Waiting for transcription...",
        date: new Date().toLocaleDateString(),
        lastUsed: Date.now(),
        filePath: filePath,
        ideas: [],
        status: filePath ? "processing" : "ready"
    };

    addSidebarItem(sessionData);
    window.electronAPI.saveSession(sessionData);

    currentIdeaIndex = 0;
    loadSessionView(sessionData);

    if (filePath) {
      setTimeout(() => triggerPythonProcessing(sessionData), 100);
    }
}

const addSidebarItem = (data, prepend = true) => {
    const item = document.createElement('div');
    item.id = `sidebar-session-${data.id}`;
    item.className = 'capture-item';

    const firstLetter = data.title.charAt(0).toUpperCase();
    item.setAttribute('data-letter', firstLetter);
    
    item.innerHTML = `
        <div class="item-title">${data.title}</div>
        <div class="item-meta">
            <span>${data.summary}</span>
            <span class="item-date">${data.date}</span>
        </div>
        <div class="delete-icon" title="Delete Session">
            <span class="material-symbols-outlined">delete</span>
        </div>
    `;

    item.addEventListener('click', () => {
      loadSessionView(data);
    });

    const deleteBtn = item.querySelector('.delete-icon');
    deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        sessionToDeleteId = data.id;
        deleteModal?.classList.remove('hidden');
    });

    if (prepend) {
      sidebarContent?.prepend(item);
    } else {
      sidebarContent?.appendChild(item);
    }
}

const loadSessionView = (session) => {
  if (!workArea) return;
  currentSessionId = session.id;

  if (!session.ideas) session.ideas = [];

  if (currentIdeaIndex >= session.ideas.length) {
    currentIdeaIndex = Math.max(0, session.ideas.length - 1);
  }

  workArea.innerHTML = '';
  workArea.style.justifyContent = 'flex-start';
  workArea.style.paddingTop = '2rem';

  const container = document.createElement('div');
  container.className = 'session-detail-container';

  // Header
  const header = document.createElement('div');
  header.className = 'session-header';
  header.innerHTML = `
    <div class="header-left" style="display:flex; align-items:center; gap:10px; flex-grow: 1;">
      <button id="back-home-btn" class="icon-btn" title="Back to Home">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <div class="session-meta" style="width: 100%;">
        <h1 id="session-title" contenteditable="true" style="outline:none;">${session.title}</h1>
        <p id="session-summary" contenteditable="true" style="outline:none;">${session.summary}</p>
      </div>
    </div>
    <div class="header-actions">
      ${!session.filePath ? `
        <button id="retro-upload-btn" class="icon-btn" title="Upload Audio">
          <span class="material-symbols-outlined">upload</span>
        </button>` : ''
      }
      <button id="delete-current-session" class="icon-btn danger" title="Delete Session">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>
  `;

  // Idea Container
  const ideaContainer = document.createElement('div');
  ideaContainer.className = 'active-idea-container';
  
  // Footer (Pagination + Plus Button)
  const footer = document.createElement('div');
  footer.className = 'session-footer';
  
  // Pagination Controls
  const pagination = document.createElement('div');
  pagination.className = 'pagination-controls ' + (session.ideas.length === 0 ? 'hidden' : '');
  pagination.innerHTML = `
    <button id="prev-idea" class="nav-btn"><span class="material-symbols-outlined">chevron_left</span></button>
    <div class="page-counter-wrapper">
      <input type="number" id="page-input" class="page-input" value="${currentIdeaIndex + 1}" min="1" max="${session.ideas.length}">
      <span style="opacity:0.7"> / ${session.ideas.length}</span>
    </div>
    <button id="next-idea" class="nav-btn"><span class="material-symbols-outlined">chevron_right</span></button>
  `;

  // Add Button
  const addBtn = document.createElement('button');
  addBtn.className = 'add-idea-btn';
  addBtn.innerHTML = '+';
  
  footer.appendChild(pagination);
  footer.appendChild(addBtn);

  container.appendChild(header);
  container.appendChild(ideaContainer);
  container.appendChild(footer);
  workArea.appendChild(container);

  // --- LOGIC ---

  if (session.ideas.length > 0) {
    renderIdea(ideaContainer, session.ideas[currentIdeaIndex], session);
  } else {
    if (session.status !== 'processing') {
        ideaContainer.innerHTML = `<div class="empty-state">No ideas yet. Click + to add one.</div>`;
    }
  }

  const isGlobalProcessing = window.activeSession 
                             && window.activeSession.id === session.id 
                             && window.activeSession.status === 'processing';

  if (session.status === 'processing' || isGlobalProcessing) {
    showThrobber(container);
    const currentLog = window.lastLogMessage || "Processing...";
    createStatusPill(currentLog);
  }
  // --- LISTENERS ---

  // Pagination
  pagination.querySelector('#prev-idea')?.addEventListener('click', () => {
    if (currentIdeaIndex > 0) {
      currentIdeaIndex--;
      loadSessionView(session);
    }
  });

  pagination.querySelector('#next-idea')?.addEventListener('click', () => {
    if (currentIdeaIndex < session.ideas.length - 1) {
      currentIdeaIndex++;
      loadSessionView(session);
    }
  });

  const pageInput = pagination.querySelector('#page-input');
  pageInput?.addEventListener('change', (e) => {
    let newPage = parseInt(e.target.value);
    
    if (isNaN(newPage) || newPage < 1) newPage = 1;
    if (newPage > session.ideas.length) newPage = session.ideas.length;

    currentIdeaIndex = newPage - 1;
    loadSessionView(session);
  });

  pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') pageInput.blur();
  });

  // Add Idea
  addBtn.onclick = () => {
    const newIdea = {
      id: Date.now(),
      name: "New Idea",
      summary: "Add a summary here...",
      text: "## Markdown\nClick to edit..."
    };
    session.ideas.push(newIdea);
    window.electronAPI.saveSession(session);
    
    currentIdeaIndex = session.ideas.length - 1;
    loadSessionView(session);
  };

  // Header Logic (Back, Delete, Edit)
  header.querySelector('#back-home-btn')?.addEventListener('click', () => loadHomeView());
  header.querySelector('#delete-current-session')?.addEventListener('click', () => {
    sessionToDeleteId = session.id;
    deleteModal?.classList.remove('hidden');
  });

  const titleEl = header.querySelector('#session-title');
  const summaryEl = header.querySelector('#session-summary');

  const updateSessionMeta = async () => {
    console.log(titleEl, summaryEl);
    session.title = titleEl.innerText.trim();
    session.summary = summaryEl.innerText.trim();
    
    await window.electronAPI.saveSession(session);
    const sbItem = document.getElementById(`sidebar-session-${session.id}`);
    if (sbItem) {
        sbItem.querySelector('.item-title').innerText = session.title;
        sbItem.querySelector('.item-meta span').innerText = session.summary;
        // Update the big letter icon
        const firstLetter = session.title.charAt(0).toUpperCase();
        sbItem.setAttribute('data-letter', firstLetter);
    }
  };
  
  [titleEl, summaryEl].forEach(el => {
    el.addEventListener('blur', updateSessionMeta);
    
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { 
            e.preventDefault(); 
            el.blur();
        }
    });
  });

  const uploadBtn = header.querySelector('#retro-upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
       const filePath = await window.electronAPI.selectAudioFile();
       if (filePath) {
         session.filePath = filePath;
         session.title = "Audio Capture";
         // Reset to start
         currentIdeaIndex = 0;
         loadSessionView(session);
         triggerPythonProcessing(session);
       }
    });
  }
}

const renderIdea = (container, idea, session) => {
  container.innerHTML = ''; 

  // --- DATA INIT ---
  if (!idea.versions || !Array.isArray(idea.versions) || idea.versions.length === 0) {
      idea.versions = [idea.text || ""];
  }
  if (typeof idea.activeVersionIndex !== 'number' || idea.activeVersionIndex >= idea.versions.length) {
      idea.activeVersionIndex = idea.versions.length - 1;
  }
  idea.text = idea.versions[idea.activeVersionIndex];

  // Default state: Edit Mode is ACTIVE (User can click to edit). 
  // Frozen = Pen OFF (User selects text).
  let isEditMode = true; 

  const node = document.createElement('div');
  node.className = 'idea-card slide-in'; 
  
  const title = idea.name || "Untitled Idea";
  const summary = idea.summary || "No summary provided.";
  const currentText = idea.versions[idea.activeVersionIndex];

  node.innerHTML = `
    <button class="delete-idea-btn" title="Delete Idea">
        <span class="material-symbols-outlined">delete</span>
    </button>

    <div class="idea-layer title-layer">
        <label>Title</label>
        <h2 contenteditable="true" class="idea-title-input" style="outline:none;">${title}</h2>
    </div>

    <div class="idea-layer summary-layer">
        <label>Summary</label>
        <div contenteditable="true" class="idea-summary-input" style="outline:none;">${summary}</div>
    </div>

    <div class="idea-layer text-layer">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <label>Full Content</label>
            
            <div class="version-controls">
                <button class="edit-mode-btn active" id="toggle-edit-mode" title="Toggle Edit Mode" style="margin-right: 10px;">
                    <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
                </button>

                <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.1); margin-right: 10px;"></div>

                <button class="version-btn" id="ver-prev" title="Previous Version">
                    <span class="material-symbols-outlined" style="font-size:16px;">chevron_left</span>
                </button>
                <span class="version-badge">
                    v<span id="ver-current">${idea.activeVersionIndex + 1}</span>/<span id="ver-total">${idea.versions.length}</span>
                </span>
                <button class="version-btn" id="ver-next" title="Next Version">
                    <span class="material-symbols-outlined" style="font-size:16px;">chevron_right</span>
                </button>
            </div>
        </div>

        <div class="markdown-view">${typeof marked !== 'undefined' ? marked.parse(currentText) : currentText}</div>
        <textarea class="markdown-editor hidden"></textarea>
    </div>

    <div class="prompt-container">
        <input type="text" class="prompt-input" placeholder="Ask AI about this idea..." />
        <button class="prompt-send-btn">
          <span class="material-symbols-outlined">send</span>
        </button>
    </div>
  `;

  // === REFERENCES ===
  const titleInput = node.querySelector('.idea-title-input');
  const summaryInput = node.querySelector('.idea-summary-input');
  const mdView = node.querySelector('.markdown-view');
  const mdEditor = node.querySelector('.markdown-editor');
  
  const btnPrev = node.querySelector('#ver-prev');
  const btnNext = node.querySelector('#ver-next');
  const lblCurrent = node.querySelector('#ver-current');
  const lblTotal = node.querySelector('#ver-total');
  const toggleEditBtn = node.querySelector('#toggle-edit-mode');

  // === HELPERS ===
  const updateVersionUI = () => {
    btnPrev.disabled = idea.activeVersionIndex <= 0;
    btnNext.disabled = idea.activeVersionIndex >= idea.versions.length - 1;
    lblCurrent.innerText = idea.activeVersionIndex + 1;
    lblTotal.innerText = idea.versions.length;
    
    const txt = idea.versions[idea.activeVersionIndex];
    idea.text = txt; 
    
    if (mdEditor) mdEditor.value = txt;
    if (mdView) mdView.innerHTML = typeof marked !== 'undefined' ? marked.parse(txt) : txt;
  };

  const save = () => {
    idea.name = titleInput.innerText;
    idea.summary = summaryInput.innerText;
    idea.versions[idea.activeVersionIndex] = mdEditor.value || idea.text;
    idea.text = idea.versions[idea.activeVersionIndex];
    window.electronAPI.saveSession(session);
  };

  // === TOGGLE EDIT MODE ===
  toggleEditBtn.addEventListener('click', () => {
      isEditMode = !isEditMode;
      
      if (isEditMode) {
          toggleEditBtn.classList.add('active');
          toggleEditBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">edit</span>';
          mdView.classList.remove('frozen');
      } else {
          toggleEditBtn.classList.remove('active');
          toggleEditBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">edit_off</span>';
          mdView.classList.add('frozen');
      }
  });

  // === MARKDOWN CLICK LOGIC ===
  mdView?.addEventListener('click', (event) => {
    // Handle Links
    if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
      event.preventDefault();
      window.electronAPI.openExternal(event.target.href);
      return;
    }

    if (!isEditMode) return;

    // Normal Edit Mode behavior
    mdView.classList.add('hidden');
    mdEditor.classList.remove('hidden');
    mdEditor.value = idea.versions[idea.activeVersionIndex];
    mdEditor.focus();
  });

  // === SELECTION & CONTEXT MENU LOGIC ===
  mdView.addEventListener('contextmenu', (e) => {
    // Only allow context menu if we are in "Frozen" mode
    if (isEditMode) return;

    const selection = window.getSelection().toString().trim();
    if (!selection) return;

    e.preventDefault();
    
    // Position Menu
    const ctxMenu = document.getElementById('custom-context-menu');
    ctxMenu.style.display = 'block';
    ctxMenu.style.left = `${e.pageX}px`;
    ctxMenu.style.top = `${e.pageY}px`;

    // Define Action Handler
    ctxMenu.onclick = (menuEvent) => {
        const action = menuEvent.target.closest('.ctx-menu-item')?.getAttribute('data-action');
        if (!action) return;
        
        ctxMenu.style.display = 'none';
        triggerSmartAction(action, selection);
    };
  });

  const triggerSmartAction = async (action, selection) => {
    // Show loading UI
    const promptInput = node.querySelector('.prompt-input');
    const sendBtn = node.querySelector('.prompt-send-btn');
    const originalIcon = sendBtn.innerHTML;
    
    promptInput.value = `Running: ${action}...`;
    promptInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span>';

    // 1. Construct the Direct Prompt
    const fullText = idea.versions[idea.activeVersionIndex];
    
    const prompts = {
        "Augment": "Expand upon the selected text by adding missing information, taking the interplay with the surrounding text into account.",
        "Explain": "Elaborate on the selected text. Explain what it means, provide context, and make it easier to parse.",
        "Simplify": "Compress the selected text into its most essential and dense representation without losing didactic value.",
        "Verify": "Fact-check the selected text. If incorrect, correct it. If correct, confirm it. Explain your reasoning."
    };

    const coreInstruction = prompts[action];

    // We explicitly format the prompt since there is no RAG system to manage context
    const directQuery = `
You are an expert editor. 
Below is the full context of a document, followed by a specific selection that the user wants you to modify.

[Start Context]
${fullText}
[End Context]

[Start Selection]
${selection}
[End Selection]

INSTRUCTION: ${coreInstruction}

IMPORTANT:
1. Return the *Entire Document* with the modification applied. 
2. Do NOT simply return the modified selection. The output must be the complete, updated text.
3. Do not add conversational filler like "Here is the updated text". Just return the text.
    `.trim();

    // 2. Send to Non-RAG Endpoint
    const result = await window.electronAPI.generate({
        query: directQuery
    });

    if (result.status === 'success') {
        // Add new version
        idea.versions.push(result.data);
        if (idea.versions.length > 10) idea.versions.shift();
        
        idea.activeVersionIndex = idea.versions.length - 1;
        updateVersionUI();
        window.electronAPI.saveSession(session);
        
        showToast(`${action} completed!`, "success");
    } else {
        showToast(result.message);
    }

    // Restore UI
    promptInput.value = "";
    promptInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalIcon;
  };

  // === EXISTING LISTENERS (Save, Edit, etc.) ===
  btnPrev.addEventListener('click', () => {
    if (idea.activeVersionIndex > 0) { idea.activeVersionIndex--; updateVersionUI(); window.electronAPI.saveSession(session); }
  });
  btnNext.addEventListener('click', () => {
    if (idea.activeVersionIndex < idea.versions.length - 1) { idea.activeVersionIndex++; updateVersionUI(); window.electronAPI.saveSession(session); }
  });

  titleInput?.addEventListener('blur', save);
  titleInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); } });

  summaryInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); summaryInput.blur(); } });
  summaryInput?.addEventListener('blur', save);

  mdEditor?.addEventListener('blur', () => {
    save();
    mdEditor.classList.add('hidden');
    mdView.classList.remove('hidden');
    updateVersionUI();
  });
  
  // Prompt Logic (Standard Chat)
  const handleRewrite = async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    promptInput.disabled = true;
    sendBtn.disabled = true;
    const originalIcon = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span>';
    
    const currentVerText = idea.versions[idea.activeVersionIndex] || "";
    const historyPayload = [{ user: `Here is the current content I am working on:\n\n"${currentVerText}"`, assistant: "Understood." }];

    const result = await window.electronAPI.chat({ query: prompt, history: historyPayload });

    if (result.status === 'success') {
        idea.versions.push(result.data);
        if (idea.versions.length > 10) idea.versions.shift();
        idea.activeVersionIndex = idea.versions.length - 1;
        updateVersionUI();
        window.electronAPI.saveSession(session);
        showToast("New version generated", "success");
        promptInput.value = ""; 
    } else {
        showToast(result.message);
    }
    promptInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalIcon;
    promptInput.focus();
  };

  node.querySelector('.prompt-send-btn')?.addEventListener('click', handleRewrite);
  node.querySelector('.prompt-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleRewrite(); }
  });

  // Delete Idea
  node.querySelector('.delete-idea-btn')?.addEventListener('click', () => {
    session.ideas = session.ideas.filter(i => i.id !== idea.id);
    window.electronAPI.saveSession(session);
    if (currentIdeaIndex >= session.ideas.length) currentIdeaIndex = Math.max(0, session.ideas.length - 1);
    loadSessionView(session);
  });

  updateVersionUI();
  container.appendChild(node);
}

const loadHomeView = () => {
  currentSessionId = null;
  workArea.innerHTML = homeViewHTML;
  workArea.style.justifyContent = 'center';
  workArea.style.paddingTop = '0';
  
  document.getElementById('upload-btn')?.addEventListener('click', handleUploadClick);
  document.getElementById('create-without-audio')?.addEventListener('click', () => createSession(null));
}

const addIdeaNode = (container, idea, session) => {
  const node = document.createElement('div');
  node.className = 'idea-node';
  node.id = `idea-node-${idea.id}`;

  const title = idea.name || "Untitled Idea";
  const rawText = idea.text || idea.preview || "Click to edit content...";
  const previewText = rawText.length > 100 ? rawText.substring(0, 100) + "..." : rawText;

  node.innerHTML = `
    <div class="idea-header">
      <div class="header-title-group" style="display:flex; align-items:center; flex-grow:1; overflow:hidden;">
        <span class="material-symbols-outlined collapse-node-btn hidden" title="Collapse" style="margin-right:8px; cursor:pointer;">expand_less</span>
        <h4 contenteditable="true" class="node-title" style="outline:none;">${title}</h4>
      </div>
      <div class="idea-actions">
        <span class="material-symbols-outlined delete-node-btn" title="Delete Idea">delete</span>
      </div>
    </div>
    
    <p class="node-preview">${previewText}</p>

    <div class="node-full-content hidden">
      <div class="markdown-view"></div>
      <textarea class="markdown-editor hidden"></textarea>
      
      <div class="prompt-container">
        <input type="text" class="prompt-input" placeholder="Ask AI about this idea..." />
        <button class="prompt-send-btn">
          <span class="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  `;

  const previewEl = node.querySelector('.node-preview');
  const fullContentEl = node.querySelector('.node-full-content');
  const mdViewEl = node.querySelector('.markdown-view');
  const mdEditorEl = node.querySelector('.markdown-editor');
  const titleEl = node.querySelector('.node-title');
  const collapseBtn = node.querySelector('.collapse-node-btn');

  node.addEventListener('click', (e) => {
    // Ignore clicks on interactive elements (delete, title, inputs)
    if (e.target.closest('.delete-node-btn') || 
        e.target.closest('.node-title') ||
        e.target.closest('.prompt-container') ||
        e.target === mdEditorEl) return;

    const isExpanded = node.classList.contains('expanded');
    
    if (!isExpanded) {
      expandNode();
    }
  });

  const expandNode = () => {
    node.classList.add('expanded');
    previewEl.classList.add('hidden');
    fullContentEl.classList.remove('hidden');

    renderMarkdown();
  }

  const collapseNode = () => {
    node.classList.remove('expanded');
    previewEl.classList.remove('hidden');
    fullContentEl.classList.add('hidden');
    collapseBtn.classList.add('hidden');
  }

  node.addEventListener('click', (e) => {
    // Ignore interactive elements
    if (e.target.closest('.delete-node-btn') || 
        e.target.closest('.node-title') ||
        e.target.closest('.prompt-container') ||
        e.target.closest('.collapse-node-btn') || // Ignore the collapse button itself
        e.target === mdEditorEl) return;

    if (!node.classList.contains('expanded')) {
      expandNode();
    }
  });

  const renderMarkdown = () => {
    if (marked) {
       mdViewEl.innerHTML = marked.parse(idea.text || "");
    } else {
       mdViewEl.innerText = idea.text || "";
    }
  }

  mdViewEl?.addEventListener('click', () => {
    mdViewEl.classList.add('hidden');
    if (!mdEditorEl) return;
    mdEditorEl.classList.remove('hidden');
    mdEditorEl.value = idea.text || "";
    mdEditorEl.focus();
  });

  mdEditorEl?.addEventListener('blur', () => {
    idea.text = mdEditorEl.value;
    window.electronAPI.saveSession(session);

    mdEditorEl.classList.add('hidden');
    mdViewEl.classList.remove('hidden');
    renderMarkdown();
    
    previewEl.innerText = idea.text.length > 100 ? idea.text.substring(0, 100) + "..." : idea.text;
  });

  mdEditorEl.addEventListener('keydown', (e) => {
    // If Enter is pressed WITHOUT Shift, we save and close.
    // If Shift IS pressed, we let the default browser behavior happen (new line).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      mdEditorEl.blur();
    }
  });

  titleEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleEl.blur();
    }
  });

  titleEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleEl.blur();
    }
  });

  titleEl?.addEventListener('blur', () => {
    idea.name = titleEl.innerText;
    window.electronAPI.saveSession(session);
  });

  node.querySelector('.delete-node-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    node.remove();
    session.ideas = session.ideas.filter(i => i.id !== idea.id);
    window.electronAPI.saveSession(session);
  });

  node.querySelector('.prompt-send-btn')?.addEventListener('click', () => {
    const input = node.querySelector('.prompt-input');
    const prompt = input.value;
    if(prompt) {
      console.log("Sending prompt for Idea " + idea.id + ": " + prompt);
      input.value = "";
    }
  });

  container.appendChild(node);
}

const showThrobber = async (container) => {
  const throbber = document.createElement('div');
  throbber.className = 'throbber-container';
  throbber.innerHTML = `
    <div class="spinner"></div>
  `;
  container.prepend(throbber);
}

window.electronAPI.onAnalysisEvent((event) => {
  // We need the parent container to find/remove the throbber
  const parentContainer = document.querySelector('.session-detail-container');
  const ideaContainer = document.querySelector('.active-idea-container');

  switch(event.type) {
    case 'log':
      window.lastLogMessage = event.message;
      updateStatusPill(event.message);
      break;

    case 'idea':
      if (currentSessionId && typeof activeSession !== 'undefined' && activeSession.id === currentSessionId) {
        
        // Data Sync
        const exists = activeSession.ideas.find(i => i.id === event.data.id);
        if (!exists) {
             activeSession.ideas.push(event.data);
             
             // UI Update
             if (activeSession.ideas.length === 1) {
                currentIdeaIndex = 0;
                loadSessionView(activeSession);
             } else {
                updatePagination(activeSession);
             }
        }
      }
      break;

    case 'complete':
        removeStatusPill(); // Remove the pill
        
        // === Remove the Floating Throbber ===
        const throbber = parentContainer?.querySelector('.throbber-container');
        if (throbber) throbber.remove();

        showToast("Extraction Completed.", "success");
        if (typeof activeSession !== 'undefined') {
            activeSession.status = 'completed';
        }
        break;
        
    case 'error':
        removeStatusPill();
        const errThrobber = parentContainer?.querySelector('.throbber-container');
        if (errThrobber) errThrobber.remove();
        
        showToast(event.message);
        break;
  }
});

const updatePagination = (session) => {
  const container = document.querySelector('.active-idea-container');
  const pageInput = document.getElementById('page-input');
  const counterWrapper = document.querySelector('.page-counter-wrapper span');
  const paginationControls = document.querySelector('.pagination-controls');

  if (paginationControls) {
      paginationControls.classList.remove('hidden');
  }

  const isViewingLastItem = currentIdeaIndex === session.ideas.length - 2; 
  const isFirstItem = session.ideas.length === 1;

  if (isViewingLastItem || isFirstItem) {
      currentIdeaIndex = session.ideas.length - 1; 
      
      if (container) {
          renderIdea(container, session.ideas[currentIdeaIndex], session);
      }
  }

  if (pageInput && counterWrapper) {
      pageInput.value = currentIdeaIndex + 1;
      pageInput.max = session.ideas.length;
      counterWrapper.innerText = ` / ${session.ideas.length}`;
  }
}

const triggerPythonProcessing = async (session) => {
  window.activeSession = session; 

  createStatusPill("Initializing AI...");

  const result = await window.electronAPI.processAudio({ 
    filePath: session.filePath, 
    sessionId: session.id 
  });

  if (result.status === 'error') {
      removeStatusPill();
      showToast(result.message);
  }
}

const createStatusPill = (msg) => {
    let pill = document.getElementById('status-pill');
    if (!pill) {
        pill = document.createElement('div');
        pill.id = 'status-pill';
        pill.className = 'status-pill slide-in';

        const header = document.querySelector('.session-header');
        if (header) header.after(pill);
    }
    pill.innerHTML = `<div class="mini-spinner"></div> <span>${msg}</span>`;
}

const updateStatusPill = (msg) => {
    const pill = document.getElementById('status-pill');
    if (pill) pill.querySelector('span').innerText = msg;
}

const removeStatusPill = () => {
    const pill = document.getElementById('status-pill');
    if (pill) pill.remove();
}

const showToast = (message, type = 'error') => {
  if (!toastMessage || !toast) return;

  toastMessage.textContent = message;

  toast.className = 'toast hidden'; 
  const icon = toast.querySelector('.material-symbols-outlined');

  if (icon) {
    icon.textContent = (type === 'success') ? 'check_circle' : 'error';
  }

  if (type === 'success') {
    toast.classList.add('success');
  }

  void toast.offsetWidth;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

const handleUploadClick = async () => {
  const filePath = await window.electronAPI.selectAudioFile();
  if (filePath) createSession(filePath);
}

document.getElementById('upload-btn')?.addEventListener('click', handleUploadClick);

// Immediately load all stored JSON files
(async () => {
  const sessions = await window.electronAPI.loadSessions();

  if (!sidebarContent) return;
  
  sidebarContent.innerHTML = '';
  sessions.forEach(data => addSidebarItem(data, false));

  const versionEl = document.getElementById('version-display');
  if (versionEl) {
    const version = await window.electronAPI.getAppVersion();
    versionEl.innerText = `© 2026 · Aura v${version}`;
  }
})();