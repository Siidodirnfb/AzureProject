(function () {
  "use strict";

  var views = {
    rules: document.getElementById("view-rules"),
    wall: document.getElementById("view-wall")
  };
  var tabs = {
    rules: document.getElementById("tab-rules"),
    wall: document.getElementById("tab-wall")
  };
  var titles = {
    rules: "Правила — Azure Shadows",
    wall: "Живой чат — Azure Shadows"
  };

  var firstRoute = true;

  function show(name, focusTitle) {
    views.rules.hidden = name !== "rules";
    views.wall.hidden = name !== "wall";
    tabs.rules.setAttribute("aria-current", name === "rules" ? "page" : "false");
    tabs.wall.setAttribute("aria-current", name === "wall" ? "page" : "false");
    document.title = titles[name];
    if (focusTitle) {
      var title = name === "rules" ? document.getElementById("rules-title") : document.getElementById("wall-title");
      title.focus({ preventScroll: false });
    }
  }

  function route() {
    var name = location.hash === "#/wall" ? "wall" : "rules";
    var focusTitle = !firstRoute;
    firstRoute = false;
    show(name, focusTitle);
    if (name === "wall") loadMessages();
  }

  window.addEventListener("hashchange", route);

  /* ---------- Правила ---------- */

  var rulesRoot = document.getElementById("rules");

  RULES_SECTIONS.forEach(function (section) {
    var wrap = document.createElement("div");
    wrap.className = "section";

    var h3 = document.createElement("h3");
    h3.textContent = section.title;
    wrap.appendChild(h3);

    var ol = document.createElement("ol");
    ol.className = "rules-list";
    ol.setAttribute("aria-label", section.title);

    for (var n = section.from; n <= section.to; n++) {
      var li = document.createElement("li");
      li.id = "r" + n;
      li.innerHTML = '<span class="num">' + n + "</span> " + escapeHtml(RULES[n]);
      ol.appendChild(li);
    }

    wrap.appendChild(ol);
    rulesRoot.appendChild(wrap);
  });

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ---------- Живой чат ---------- */

  var wallStatus = document.getElementById("wall-status");
  var wallList = document.getElementById("wall-list");
  var wallRefresh = document.getElementById("wall-refresh");
  var liveMode = false;
  var timer = null;
  var busy = false;

  function status(text) {
    wallStatus.textContent = text;
  }

  function getJSON(url) {
    var bust = url + (url.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
    return fetch(bust).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    });
  }

  function loadMessages() {
    if (busy) return;
    busy = true;
    wallRefresh.disabled = true;

    getJSON("api/messages")
      .catch(function () {
        liveMode = false;
        if (timer) { clearInterval(timer); timer = null; }
        return getJSON("data/messages.json");
      })
      .then(function (data) {
        if (!data || !data.messages) throw new Error("empty");
        liveMode = !!data.live;
        renderWall(data);
        if (liveMode && !timer) timer = setInterval(loadMessages, 10000);
        if (!liveMode) {
          var p = data.takenAtLabel || "недавний срез";
          status("Сохранённый срез от " + p + ". Живого обновления нет: откройте сайт через node server.mjs.");
        }
      })
      .catch(function () {
        status("Чат не отобразился: сервер не запущен и среза рядом тоже нет.");
        wallList.innerHTML = "";
      })
      .finally(function () {
        busy = false;
        wallRefresh.disabled = false;
      });
  }

  function renderWall(data) {
    wallList.innerHTML = "";
    if (liveMode) {
      status("Живой чат — обновляется сам." + (data.takenAtLabel ? " Данные: " + data.takenAtLabel + "." : ""));
    }

    if (data.members) {
      status((wallStatus.textContent + " ").trim() + "В группе " + data.members + " участника.");
    }

    data.messages.forEach(function (m) {
      var li = document.createElement("li");

      var who = document.createElement("div");
      who.className = "who";

      var author = document.createElement("span");
      author.className = "author";
      author.textContent = m.author;
      who.appendChild(author);

      if (m.bot) {
        var badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "бот";
        who.appendChild(badge);
      }

      var time = document.createElement("span");
      time.className = "time";
      time.textContent = m.time;
      who.appendChild(time);

      var body = document.createElement("p");
      body.className = "body";
      body.textContent = m.text;

      li.appendChild(who);
      li.appendChild(body);
      wallList.appendChild(li);
    });

    if (!data.messages.length) {
      status("Сообщений пока нет.");
    }
  }

  wallRefresh.addEventListener("click", loadMessages);

  /* Старт */
  route();
})();
