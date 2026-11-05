const PROFILE_URL = "data/profile.json";

async function loadProfile() {
  const response = await fetch(PROFILE_URL);
  if (!response.ok) throw new Error("Could not load profile.json");
  return response.json();
}

function setTextBindings(profile) {
  document.querySelectorAll("[data-profile]").forEach((node) => {
    const key = node.dataset.profile;
    if (profile[key] !== undefined) node.textContent = profile[key];
  });
  document.title = `${profile.name} — ${profile.siteTitle || "Bio & Space"}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", profile.metaDescription || profile.intro);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${profile.name} — ${profile.siteTitle || "Bio & Space"}`);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", profile.metaDescription || profile.intro);
}

function renderTags(id, values, className) {
  const root = document.getElementById(id);
  if (!root) return;
  root.innerHTML = (values || []).map((value) =>
    `<span class="${className}">${escapeHtml(value)}</span>`
  ).join("");
}

function renderDiscordServers(servers) {
  const list = document.getElementById("serverList");
  if (!list || !servers) return;

  list.innerHTML = servers.map(server => {
    const isPublic = server.status === "public";
    const hasInvite = Boolean(server.inviteUrl);
    const hasWidget = Boolean(server.widgetUrl);
    const isDeleted = server.status === "deleted";

    let actionsHtml = "";
    if (isPublic && (hasInvite || hasWidget)) {
      actionsHtml = `
        <div class="server-actions">
          ${hasInvite ? `
            <a href="${escapeAttr(server.inviteUrl)}" class="invite-btn join-link" target="_blank" rel="noopener" title="Join server ${escapeAttr(server.name)}" onclick="event.stopPropagation()">
              Join Server <svg viewBox="0 0 24 24" fill="none" style="width:11px;height:11px;"><path d="M7 17 17 7M17 7H8m9 0v9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </a>
          ` : ''}
          ${hasWidget ? `
            <button type="button" class="invite-btn widget-trigger" title="View Live Widget ${escapeAttr(server.name)}" onclick="event.stopPropagation(); window.openDiscordModal('${escapeAttr(server.name)}', '${escapeAttr(server.widgetUrl)}', '${escapeAttr(server.inviteUrl || '')}')">
              Widget 👁
            </button>
          ` : ''}
        </div>
      `;
    } else if (isDeleted) {
      actionsHtml = `<span class="invite-btn is-static">Deleted</span>`;
    } else {
      actionsHtml = `<span class="invite-btn is-static">Private</span>`;
    }

    return `
      <li class="server-row glass"
          data-status="${escapeAttr(server.status || 'public')}"
          data-widget-url="${escapeAttr(server.widgetUrl || '')}"
          data-invite-url="${escapeAttr(server.inviteUrl || '')}"
          data-server-name="${escapeAttr(server.name)}"
          title="${hasWidget ? 'Click to view Live Widget' : ''}">
        <span class="server-info">
          <span class="server-name">${escapeHtml(server.name)}</span>
          <span class="badge ${escapeAttr(server.badgeClass || 'badge-supporter')}">${escapeHtml(server.role)}</span>
        </span>
        ${actionsHtml}
      </li>
    `;
  }).join("");

  attachServerRowEvents();
}

function renderContactLinks(profile) {
  const socials = profile.socials || {};
  const contactRoot = document.getElementById("contactLinks");
  if (!contactRoot) return;

  const links = [];
  if (socials.github) links.push({ label: "GitHub", url: socials.github, target: true });
  if (socials.youtube) links.push({ label: "YouTube", url: socials.youtube, target: true });
  if (socials.discord) links.push({ label: "Discord: @" + socials.discord, url: "#servers", isDiscordTag: true });
  
  // Sync Discord server invites into contact links
  if (socials.discordInvites && Array.isArray(socials.discordInvites)) {
    socials.discordInvites.forEach(inv => {
      links.push({ label: `Discord: ${inv.name}`, url: inv.url, target: true, isInvite: true });
    });
  } else if (profile.discordServers) {
    profile.discordServers.forEach(srv => {
      if (srv.inviteUrl && srv.status === "public") {
        links.push({ label: `Discord: ${srv.name}`, url: srv.inviteUrl, target: true, isInvite: true });
      }
    });
  }

  if (profile.email) links.push({ label: "Email", url: `mailto:${profile.email}`, target: false });

  contactRoot.innerHTML = links.map(link => {
    if (link.isDiscordTag) {
      return `<a href="#servers" class="text-link" id="contactDiscord">${escapeHtml(link.label)}</a>`;
    }
    return `<a href="${escapeAttr(link.url)}" class="text-link" ${link.target ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(link.label)} ↗</a>`;
  }).join("");
}

async function loadRepositories(username, limit = 6) {
  const grid = document.getElementById("projectsGrid");
  const note = document.getElementById("apiNote");
  if (!grid) return;

  if (!username) {
    grid.innerHTML = `<article class="glass project-card"><div class="project-top"><span>GITHUB / NOTICE</span><span class="project-icon">!</span></div><h3>No username configured</h3><p>Configure githubUsername in profile.json.</p></article>`;
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${limit}`);
    if (!response.ok) throw new Error(`GitHub API returned status ${response.status}`);
    const repos = (await response.json()).filter(repo => !repo.fork).slice(0, limit);
    if (!repos.length) throw new Error("No public repositories found.");

    grid.innerHTML = repos.map((repo, index) => `
      <a class="glass project-card" href="${escapeAttr(repo.html_url)}" target="_blank" rel="noreferrer">
        <div class="project-top">
          <span>REPOSITORY / 0${index + 1}</span>
          <span class="project-icon">↗</span>
        </div>
        <h3>${escapeHtml(repo.name)}</h3>
        <p>${escapeHtml(repo.description || "A project from my GitHub workspace.")}</p>
        <div class="project-meta">
          <span>${escapeHtml(repo.language || "CODE")}</span>
          <span>★ ${repo.stargazers_count} &nbsp;⑂ ${repo.forks_count}</span>
        </div>
      </a>
    `).join("");
    if (note) note.textContent = `Showing ${repos.length} latest public repositories from GitHub.`;
  } catch (error) {
    grid.innerHTML = `
      <article class="glass project-card">
        <div class="project-top"><span>GITHUB / PROFILE</span><span class="project-icon">↗</span></div>
        <h3>${escapeHtml(username)}</h3>
        <p>Visit my GitHub profile to see all projects and source code.</p>
        <div class="project-meta">
          <span>GITHUB</span>
          <a href="https://github.com/${encodeURIComponent(username)}" target="_blank" rel="noreferrer" style="color:var(--violet);">View profile ↗</a>
        </div>
      </article>
    `;
    if (note) note.textContent = "Could not load automatically due to GitHub's unauthenticated API rate limit.";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setupCopyDiscord(username = "mia.hashimoto") {
  const triggerCopy = async () => {
    try {
      await navigator.clipboard.writeText(username);
      showToast(`Copied Discord tag: ${username}`);
      const label = document.getElementById("discordLabel");
      if (label) {
        const original = label.textContent;
        label.textContent = "Copied!";
        label.style.color = "#57F287";
        setTimeout(() => {
          label.textContent = original;
          label.style.color = "";
        }, 1500);
      }
    } catch {
      prompt("Discord username:", username);
    }
  };

  const discordTile = document.getElementById("discordTile");
  if (discordTile) {
    discordTile.addEventListener("click", triggerCopy);
  }

  const copyDiscordBtn = document.getElementById("copyDiscordBtn");
  if (copyDiscordBtn) {
    copyDiscordBtn.addEventListener("click", triggerCopy);
  }
}

function setupModal() {
  const modalOverlay = document.getElementById("server-modal-overlay");
  if (!modalOverlay) return;

  const modalServerName = document.getElementById("modalServerName");
  const modalWidgetIframe = document.getElementById("modalWidgetIframe");
  const modalInviteLink = document.getElementById("modalInviteLink");
  const closeBtn = document.getElementById("modalCloseBtn");

  window.openDiscordModal = function(name, widgetUrl, inviteUrl) {
    if (!widgetUrl) return;
    modalServerName.textContent = name;
    modalWidgetIframe.src = widgetUrl;
    if (inviteUrl) {
      modalInviteLink.href = inviteUrl;
      modalInviteLink.style.display = "inline-flex";
    } else {
      modalInviteLink.style.display = "none";
    }
    modalOverlay.classList.add("is-open");
  };

  function closeModal() {
    modalOverlay.classList.remove("is-open");
    setTimeout(() => {
      if (!modalOverlay.classList.contains("is-open")) {
        modalWidgetIframe.src = "about:blank";
      }
    }, 280);
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("is-open")) {
      closeModal();
    }
  });
}

function attachServerRowEvents() {
  document.querySelectorAll(".server-row[data-widget-url]").forEach(row => {
    row.addEventListener("click", () => {
      const widgetUrl = row.dataset.widgetUrl;
      const inviteUrl = row.dataset.inviteUrl;
      const serverName = row.dataset.serverName;
      if (widgetUrl && window.openDiscordModal) {
        window.openDiscordModal(serverName, widgetUrl, inviteUrl);
      }
    });
  });

  setupRevealHighlight();
}

function setupRevealHighlight() {
  // Fluent "reveal highlight" — track pointer position per element
  document.querySelectorAll('.tile, .server-row, .project-card, .panel').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      el.style.setProperty('--x', (e.clientX - rect.left) + 'px');
      el.style.setProperty('--y', (e.clientY - rect.top) + 'px');
    });
  });
}

function setupInteractions() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile navigation drawer toggle
  const toggle = document.getElementById("menuToggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  // Active section indicator via IntersectionObserver
  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".nav-link")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach(section => observer.observe(section));
  }

  setupModal();
  setupRevealHighlight();
}

// Initialise
setupInteractions();

loadProfile()
  .then(profile => {
    setTextBindings(profile);
    renderTags("interests", profile.interests, "tag");
    renderTags("skills", profile.skills, "skill");
    renderDiscordServers(profile.discordServers);
    renderContactLinks(profile);
    setupCopyDiscord(profile.socials?.discord || "mia.hashimoto");
    return loadRepositories(profile.githubUsername, profile.repoLimit || 6);
  })
  .catch(error => {
    console.error("Initialization error:", error);
    const apiNote = document.getElementById("apiNote");
    if (apiNote) apiNote.textContent = error.message;
  });
