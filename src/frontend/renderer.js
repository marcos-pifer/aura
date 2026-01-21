// Sidebar
const sidebar = document.getElementById('aura-sidebar');
const toggleBtn = document.getElementById('toggle-btn');
const icon = document.getElementById('sidebar-icon');

// Upload
const uploadBtn = document.getElementById('upload-btn');
const noFileLink = document.getElementById('create-without-audio');
const sidebarContent = document.querySelector('.sidebar-content');

// Settings
const settingsBtn = document.getElementById('settings-btn');
const modal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const errorMsg = document.getElementById('settings-error-msg');

// Setting inputs
const apiKeyInput = document.getElementById('api-key');
const apiUrlInput = document.getElementById('api-url');
const apiTempInput = document.getElementById('api-temp');
const apiTokensInput = document.getElementById('api-tokens');

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

toggleBtn?.addEventListener('click', () => {
  if (!sidebar || !icon) return;

  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  icon.textContent = (isCollapsed) ? "menu" : "chevron_left";
});

uploadBtn?.addEventListener('click', async () => {
  const filePath = await window.electronAPI.selectAudioFile(); // Don't worry, this exists!

  if (filePath) {
    createSession(filePath);
  }
});

noFileLink?.addEventListener('click', () => {
  createSession();
});

settingsBtn?.addEventListener('click', () => {
  if (!modal || !errorMsg) return;

  modal.classList.remove('hidden');
  errorMsg.classList.add('hidden');
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
  e.preventDefault(); e.stopPropagation();
  dragOverlay?.classList.remove('hidden');
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault(); e.stopPropagation();
  if (e.clientX === 0 || e.clientY === 0) dragOverlay?.classList.add('hidden');
});

document.addEventListener('drop', (e) => {
  e.preventDefault(); e.stopPropagation();
  dragOverlay?.classList.add('hidden');

  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.toLowerCase().endsWith('.mp3')) {
      createSession(file.path); 
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

  if (!url || !key || !temp || !tokens) {
    errorMsg?.classList.remove('hidden');
    const modalContent = document.querySelector('.modal-content');
    modalContent?.classList.add('shake');
    setTimeout(() => modalContent?.classList.remove('shake'), 400);

    return;
  }

  const settings = {
    url: url,
    key: key,
    temperature: parseFloat(temp),
    maxTokens: parseInt(tokens)
  };

  await window.electronAPI.saveSettings(settings);
  
  errorMsg?.classList.add('hidden');
  modal?.classList.add('hidden');
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

  if (session.status === 'processing') {
    showThrobber(ideaContainer);
  } else if (session.ideas.length > 0) {
    renderIdea(ideaContainer, session.ideas[currentIdeaIndex], session);
  } else {
    ideaContainer.innerHTML = `<div class="empty-state">No ideas yet. Click + to add one.</div>`;
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

  const updateSessionMeta = () => {
    session.title = titleEl.innerText;
    session.summary = summaryEl.innerText;
    window.electronAPI.saveSession(session);
    
    // Update Sidebar
    const sbItem = document.getElementById(`sidebar-session-${session.id}`);
    if (sbItem) {
        sbItem.querySelector('.item-title').innerText = session.title;
        sbItem.querySelector('.item-meta span').innerText = session.summary;
        sbItem.setAttribute('data-letter', session.title.charAt(0).toUpperCase());
    }
  };
  
  [titleEl, summaryEl].forEach(el => {
    el.addEventListener('blur', updateSessionMeta);
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
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

  const node = document.createElement('div');
  node.className = 'idea-card slide-in'; 
  
  const title = idea.name || "Untitled Idea";
  const summary = idea.summary || "No summary provided.";
  const rawText = idea.text || "";

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
        <label>Full Content</label>
        <div class="markdown-view">${typeof marked !== 'undefined' ? marked.parse(rawText) : rawText}</div>
        <textarea class="markdown-editor hidden"></textarea>
    </div>

    <div class="prompt-container">
        <input type="text" class="prompt-input" placeholder="Ask AI about this idea..." />
        <button class="prompt-send-btn">
          <span class="material-symbols-outlined">send</span>
        </button>
    </div>
  `;

  // === LOGIC ===
  const titleInput = node.querySelector('.idea-title-input');
  const summaryInput = node.querySelector('.idea-summary-input');
  const mdView = node.querySelector('.markdown-view');
  const mdEditor = node.querySelector('.markdown-editor');

  const save = () => {
    idea.name = titleInput.innerText;
    idea.summary = summaryInput.innerText;
    idea.text = mdEditor.value || rawText; 
    window.electronAPI.saveSession(session);
  };

  titleInput?.addEventListener('blur', save);
  titleInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
  });

  summaryInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      summaryInput.blur();
    }
  });

  summaryInput?.addEventListener('blur', save);

  mdView?.addEventListener('click', () => {
    mdView.classList.add('hidden');
    mdEditor.classList.remove('hidden');
    mdEditor.value = idea.text || "";
    mdEditor.focus();
  });

  mdEditor?.addEventListener('blur', () => {
    idea.text = mdEditor.value;
    window.electronAPI.saveSession(session);
    mdEditor.classList.add('hidden');
    mdView.classList.remove('hidden');
    mdView.innerHTML = typeof marked !== 'undefined' ? marked.parse(idea.text) : idea.text;
  });

  mdEditor?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      mdEditor.blur();
    }
  });

  // Prompt Logic
  node.querySelector('.prompt-send-btn')?.addEventListener('click', () => {
    const input = node.querySelector('.prompt-input');
    const prompt = input.value;
    if (prompt) {
        input.value = "";
    }
  });

  // Delete Idea
  node.querySelector('.delete-idea-btn')?.addEventListener('click', () => {
    session.ideas = session.ideas.filter(i => i.id !== idea.id);
    window.electronAPI.saveSession(session);
    
    if (currentIdeaIndex >= session.ideas.length) {
        currentIdeaIndex = Math.max(0, session.ideas.length - 1);
    }
    loadSessionView(session);
  });

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
    <span>Analyzing Audio...</span>
  `;
  container.prepend(throbber);
}

const triggerPythonProcessing = async (session) => {
  const container = document.querySelector('.active-idea-container');
  if (container) showThrobber(container);

  const result = await window.electronAPI.processAudio({ 
    filePath: session.filePath, 
    sessionId: session.id 
  });

  if (result.status !== 'success') {
    if (container) {
      container.innerHTML = `<div class="error-state">${result.message || "Error processing"}</div>`;
    }

    showToast("Error processing audio.");
    return;
  }

  session.status = 'completed';
  session.ideas = result.ideas;
  currentIdeaIndex = 0;
  loadSessionView(session);
}

const showToast = (message) => {
  if (!toastMessage || !toast) return;

  toastMessage.textContent = message;
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
})();