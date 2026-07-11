(function () {
  "use strict";
  const data = window.LLMSTUDY_DATA || { GLOSSARY:[], TIMELINE:[], FLASHCARDS:[], QUIZ:[], PART_INDEX:[] };
  const store = window.LLMSTUDY_STORAGE;
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  function chapterCount() { return data.PART_INDEX.length || 23; }
  function progressUpdate() {
    if (!store) return;
    const progress = store.getProgress(), count = Object.keys(progress).filter(k => progress[k]).length, total = chapterCount();
    $$("[data-progress-summary], [data-progress-indicator]").forEach(el => { el.textContent = `${count} / ${total} chapters · ${Math.round(count / total * 100)}%`; });
    $$("[data-progress-bar]").forEach(el => { el.style.width = `${count / total * 100}%`; });
    $$("[data-dashboard-chapter]").forEach(el => el.classList.toggle("done", Boolean(progress[el.dataset.dashboardChapter])));
  }
  function initProgress() {
    if (!store) return;
    $$("[data-progress-key]").forEach(input => {
      input.checked = Boolean(store.getProgress()[input.dataset.progressKey]);
      input.addEventListener("change", () => { store.setProgress(input.dataset.progressKey, input.checked); progressUpdate(); });
    });
    progressUpdate();
  }
  function initNavigation() {
    const header = $(".site-header");
    if (!header) return;
    const plainNav = $(":scope > nav[aria-label='Primary navigation']", header);
    if (plainNav) {
      plainNav.classList.add("site-nav");
      plainNav.id = "primary-nav";
      const menu = document.createElement("button");
      menu.className = "nav-toggle secondary";
      menu.type = "button";
      menu.dataset.navToggle = "";
      menu.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-controls", "primary-nav");
      menu.textContent = "Menu";
      plainNav.before(menu);
    }
    const progress = $(".progress-indicator", header);
    if (progress && !progress.hasAttribute("data-progress-indicator")) progress.dataset.progressIndicator = "";
    if (!$("[data-search-trigger], [data-action='open-search']", header)) {
      const search = document.createElement("button");
      search.className = "secondary";
      search.type = "button";
      search.dataset.searchTrigger = "";
      search.textContent = "Search";
      const host = $(".site-header-inner", header) || header;
      host.append(search);
    }
    const toggle = $("[data-nav-toggle], [data-action='toggle-nav']", header);
    if (toggle && header) toggle.addEventListener("click", () => { const open = header.classList.toggle("nav-open"); toggle.setAttribute("aria-expanded", String(open)); });
    if (store) {
      const page = location.pathname.split("/").pop() || "index.html";
      if (page !== "index.html") store.setLastVisited(page, location.hash);
      const link = $("[data-continue-link]"), visit = store.lastVisited();
      if (link && visit && visit.page && visit.page !== "index.html") { link.href = visit.page + (visit.hash || ""); link.hidden = false; }
    }
  }
  function initToc() {
    if (!("IntersectionObserver" in window)) return;
    const sections = $$("main section[id^='ch-']");
    if (!sections.length) return;
    const links = $$("[data-toc-link], .toc-sidebar a[href^='#'], .mobile-toc a[href^='#'], .toc-mobile a[href^='#']")
      .filter(link => /^#ch-\d\d$/.test(link.getAttribute("href") || ""));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id));
    }), { rootMargin:"-20% 0px -70% 0px" });
    sections.forEach(section => observer.observe(section));
  }
  function initHashTarget() {
    if (!location.hash) return;
    let targetId;
    try { targetId = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(targetId);
    if (!target) return;
    let parent = target.parentElement;
    while (parent) { if (parent.tagName === "DETAILS") parent.open = true; parent = parent.parentElement; }
    setTimeout(() => { target.classList.add("is-target-flash"); target.scrollIntoView({ block:"start" }); }, 0);
  }
  function initCopy() {
    $$("[data-copy-target]").forEach(button => {
      button.classList.remove("js-only");
      button.addEventListener("click", async () => {
        const code = $("#" + button.dataset.copyTarget);
        if (!code) return;
        try { await navigator.clipboard.writeText(code.textContent); button.textContent = "Copied"; setTimeout(() => button.textContent = "Copy", 1200); } catch (_) { button.textContent = "Select text"; }
      });
    });
  }
  function initPrint() {
    let states = [];
    addEventListener("beforeprint", () => { states = $$("details").map(d => d.open); $$("details").forEach(d => d.open = true); });
    addEventListener("afterprint", () => $$("details").forEach((d,i) => d.open = states[i]));
  }
  function initPreferences() {
    if (!store) return;
    const pref = store.prefs(), root = document.documentElement;
    if (!$("[data-pref-motion]")) {
      const footer = $(".site-footer .footer-inner") || $(".site-footer");
      if (footer) {
        const controls = document.createElement("span");
        controls.className = "display-menu";
        controls.innerHTML = 'Motion <select data-pref-motion aria-label="Motion preference"><option value="auto">Auto</option><option value="on">Reduced</option><option value="off">Full</option></select> Text <select data-pref-font aria-label="Text size"><option value="1">100%</option><option value="1.1">110%</option><option value="1.2">120%</option></select>';
        footer.append(controls);
      }
    }
    function apply(p) { root.classList.toggle("motion-reduced", p.reducedMotion === "on"); root.classList.toggle("motion-full", p.reducedMotion === "off"); root.style.setProperty("--font-scale", p.fontScale || 1); }
    apply(pref);
    $$("[data-pref-motion]").forEach(select => { select.value = pref.reducedMotion || "auto"; select.addEventListener("change", () => { store.setPrefs({ reducedMotion:select.value }); apply(store.prefs()); }); });
    $$("[data-pref-font]").forEach(select => { select.value = pref.fontScale || 1; select.addEventListener("change", () => { store.setPrefs({ fontScale:Number(select.value) }); apply(store.prefs()); }); });
  }
  function initGlossary() {
    const filter = $("[data-glossary-filter]"), items = $$("[data-glossary-term]");
    const entries = items.length ? items : $$(".glossary-entry");
    if (!filter || !entries.length) return;
    let source = "all";
    function apply() {
      const q = filter.value.toLowerCase().trim();
      let visible = 0;
      entries.forEach(item => {
        const matches = item.textContent.toLowerCase().includes(q) && (source === "all" || item.dataset.source === source);
        item.hidden = !matches;
        if (matches) visible++;
      });
      const count = $("#glossary-result-count");
      if (count) count.textContent = `${visible} term${visible === 1 ? "" : "s"} shown`;
    }
    filter.addEventListener("input", apply);
    $$("[data-source-filter-value]").forEach(button => button.addEventListener("click", () => {
      source = button.dataset.sourceFilterValue;
      $$("[data-source-filter-value]").forEach(control => control.setAttribute("aria-pressed", String(control === button)));
      apply();
    }));
    apply();
  }
  function initSearch() {
    const trigger = $("[data-search-trigger], [data-action='open-search']");
    if (!trigger) return;
    trigger.classList.remove("js-only");
    let dialog, input, results, selected = 0, returnFocus = trigger;
    const index = [].concat(data.GLOSSARY.map(g => ({ title:g.term, text:g.definition, href:`glossary.html#${g.id}` })), data.PART_INDEX.map(p => ({ title:`${p.chapterRef}: ${p.title}`, text:p.headings.join(" "), href:`${p.page}#${p.chapterRef}` })));
    function render() {
      const q = input.value.toLowerCase().trim(), found = index.filter(x => !q || (x.title + " " + x.text).toLowerCase().includes(q)).slice(0,12); selected = Math.min(selected, Math.max(found.length - 1, 0));
      results.innerHTML = found.length ? found.map((item,i) => `<li><a class="${i===selected?"is-selected":""}" href="${item.href}"><strong>${item.title}</strong><br><small>${item.text}</small></a></li>`).join("") : "<li>No matching topics.</li>";
      $("[data-search-count]", dialog).textContent = `${found.length} result${found.length===1?"":"s"}`;
      return found;
    }
    function close() { if (!dialog) return; dialog.remove(); dialog = null; returnFocus.focus(); }
    function open() {
      if (dialog) return; returnFocus = document.activeElement || trigger;
      dialog = document.createElement("dialog"); dialog.className = "search-dialog"; dialog.setAttribute("aria-label","Search the study guide");
      dialog.innerHTML = `<div class="search-panel"><div style="display:flex;justify-content:space-between;gap:1rem"><h2 style="margin-top:0">Search the guide</h2><button class="secondary" type="button" data-search-close>Close</button></div><label>Search chapters and glossary<input class="search-input" data-search-input autocomplete="off"></label><p class="deck-status" data-search-count aria-live="polite"></p><ul class="search-results" data-search-results></ul></div>`;
      document.body.append(dialog); dialog.showModal(); input = $("[data-search-input]",dialog); results = $("[data-search-results]",dialog); render(); input.focus();
      $("[data-search-close]",dialog).addEventListener("click",close);
      dialog.addEventListener("click",e => { if(e.target===dialog) close(); });
      dialog.addEventListener("keydown", e => {
        if (e.key === "Escape") { e.preventDefault(); close(); return; }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const all = render(); if (!all.length) return; selected = (selected + (e.key==="ArrowDown"?1:-1)+all.length)%all.length; render(); }
        if (e.key === "Enter" && document.activeElement === input) { const link = $(".is-selected",results); if(link) link.click(); }
        if (e.key === "Tab") { const focusable=$$("button,input,a",dialog).filter(e=>!e.disabled); const first=focusable[0],last=focusable.at(-1); if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()} }
      });
      input.addEventListener("input",() => { selected=0; render(); });
    }
    trigger.addEventListener("click",open);
    document.addEventListener("keydown",e => { if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();} });
  }
  function initPractice() {
    const card = $("[data-deck-card]"), front = $("[data-deck-front]"), back = $("[data-deck-back]");
    const partFilter = $("[data-practice-part]"), chapterFilter = $("[data-practice-chapter]"), due = $("[data-practice-due]"), status = $("[data-deck-status]");
    if (card && front && back && partFilter && store) {
      let deck=[], pos=0;
      function filtered() { const srs=store.getSrs(); return data.FLASHCARDS.filter(f => (!partFilter.value||f.part===partFilter.value) && (!chapterFilter.value||f.chapterRef===chapterFilter.value) && (!due.checked||!srs[f.id]||srs[f.id].bucket!=="known")); }
      function show() { deck=filtered(); if(pos>=deck.length)pos=0; const f=deck[pos]; if(!f){front.textContent="No cards match this filter.";back.textContent="Choose another part or clear Review due.";back.hidden=false;status.textContent="0 cards";return;} card.dataset.cardId=f.id;card.setAttribute("aria-pressed","false"); front.textContent=f.front;back.textContent=f.back;back.hidden=true;status.textContent=`Card ${pos+1} of ${deck.length} · ${store.getSrs()[f.id]?.bucket||"new"}`; }
      function flip(){ const pressed=card.getAttribute("aria-pressed")==="true";card.setAttribute("aria-pressed",String(!pressed));back.hidden=pressed; }
      function rate(bucket){const f=deck[pos];if(!f)return; const old=store.getSrs()[f.id]?.bucket||"new";let next=bucket==="again"?"learning":old==="new"?"learning":"known";store.setSrs(f.id,next);pos++;show();}
      card.addEventListener("click",flip);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip()}if(e.key==="ArrowRight")rate("know");if(e.key==="ArrowLeft")rate("again");if(e.key==="Escape")partFilter.focus();});
      $$("[data-card-action]").forEach(b=>b.addEventListener("click",()=>rate(b.dataset.cardAction)));
      [partFilter,chapterFilter,due].forEach(e=>e.addEventListener("change",()=>{pos=0;show();}));show();
    }
    const quiz = $("[data-quiz]"), quizPart = $("[data-quiz-part]"), score = $("[data-quiz-status]");
    if (quiz && quizPart && store) {
      function filterQuiz() {
        $$(".quiz-question", quiz).forEach(q => {
          q.hidden = q.dataset.quizPart !== quizPart.value;
          $$("input", q).forEach(input => input.checked = false);
          q.classList.remove("is-correct", "is-incorrect");
          const feedback = $(".answer-feedback", q);
          if (feedback) feedback.textContent = "";
        });
        score.textContent = "Answer all five questions, then score this quiz.";
      }
      function mark() { const questions=$$(".quiz-question",quiz).filter(q=>!q.hidden);let correct=0,missed=[];questions.forEach(q=>{const chosen=$("input:checked",q);q.classList.remove("is-correct","is-incorrect");if(!chosen){missed.push(q.dataset.quizId);return;}const ok=Number(chosen.value)===Number(q.dataset.correct);q.classList.add(ok?"is-correct":"is-incorrect");if(ok)correct++;else missed.push(q.dataset.quizId);const out=$(".answer-feedback",q);if(out)out.textContent=(ok?"✓ Correct. ":"✗ Not quite. ")+q.dataset.explanation;});score.textContent=`Score: ${correct} / ${questions.length}`;store.addAttempt(quizPart.value,correct,questions.length,missed);const retry=$("[data-retry-missed]");if(retry)retry.hidden=!missed.length; }
      $("[data-score-quiz]")?.addEventListener("click",mark);
      $("[data-retry-missed]")?.addEventListener("click",()=>{const latest=store.attempts(quizPart.value).at(-1);if(!latest?.missed?.length)return;$$(".quiz-question",quiz).forEach(q=>q.hidden=!latest.missed.includes(q.dataset.quizId));score.textContent="Showing missed questions only.";});
      quizPart.addEventListener("change", filterQuiz);
      filterQuiz();
    }
  }
  document.addEventListener("DOMContentLoaded", () => { document.documentElement.classList.add("has-js"); $$(".js-only").forEach(el => el.classList.remove("js-only")); initNavigation();initProgress();initToc();initHashTarget();initCopy();initPrint();initPreferences();initGlossary();initSearch();initPractice(); });
}());
