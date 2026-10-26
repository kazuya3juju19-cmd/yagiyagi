
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const STORAGE_KEY = "yagi-zukan-save-v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

  const plantInfo = {
    "タンポポ": {
      safety: "一般にヤギが食べることのある植物",
      toxic: false,
      description: "黄色い花が特徴。"
    },
    "シロツメクサ": {
      safety: "食べすぎには注意",
      toxic: false,
      description: "白い花が集まって咲く植物。"
    },
    "オオバコ": {
      safety: "植物の種類や状態に注意",
      toxic: false,
      description: "地面に葉が広がる植物。"
    },
    "ナズナ": {
      safety: "植物の種類や状態に注意",
      toxic: false,
      description: "春によく見られる植物。"
    },
    "ヨモギ": {
      safety: "植物の種類や状態に注意",
      toxic: false,
      description: "香りのある葉を持つ植物。"
    },
    "スイセン": {
      safety: "有毒。食べさせない",
      toxic: true,
      description: "球根や葉などに毒がある。"
    },
    "キョウチクトウ": {
      safety: "強い毒がある。絶対に食べさせない",
      toxic: true,
      description: "植物全体に強い毒がある。"
    },
    "不明な植物": {
      safety: "安全性不明。食べさせない",
      toxic: true,
      description: "名前がわからない植物は安全と判断できない。"
    }
  };

  const defaultState = () => ({
    petName: "はる",
    birthday: Date.now(),
    startedAt: Date.now(),
    lastVisit: Date.now(),
    lastTick: Date.now(),
    mood: "idle",
    thought: "こっちに来てくれたよ！",
    message: "はるは牧場を歩きながら、あなたを見ているよ。",
    hunger: 65,
    thirst: 70,
    energy: 85,
    cleanliness: 80,
    affection: 35,
    health: 100,
    feedCount: 0,
    careCount: 0,
    dayCount: 1,
    plants: [],
    plantPhotos: {},
    photoPreview: null
  });

  let state = loadState();
  let currentPhoto = null;
  let currentPhotoData = null;
  let noticeTimer = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();

      const saved = JSON.parse(raw);
      return {
        ...defaultState(),
        ...saved,
        plants: Array.isArray(saved.plants) ? saved.plants : [],
        plantPhotos: saved.plantPhotos || {}
      };
    } catch (error) {
      console.warn("セーブデータを読み込めませんでした。", error);
      return defaultState();
    }
  }

  function saveState(showMessage = false) {
    try {
      state.lastVisit = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (showMessage) {
        showNotice("💾 セーブしたよ！ 次に遊ぶときも続きから始められるよ。");
      }
    } catch (error) {
      showNotice("保存できなかったよ。写真の容量が大きすぎるかもしれないね。");
      console.error(error);
    }
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function changeStat(key, amount) {
    state[key] = clamp(Number(state[key] || 0) + amount);
  }

  function getAgeMonths() {
    const elapsed = Math.max(0, Date.now() - state.birthday);
    return 2 + Math.floor(elapsed / (30 * DAY_MS));
  }

  function getAgeText() {
    const months = getAgeMonths();
    const years = Math.floor(months / 12);
    const remainder = months % 12;

    if (years > 0) {
      return remainder
        ? `生後${years}年${remainder}か月`
        : `生後${years}年`;
    }
    return `生後${months}か月`;
  }

  function updateElapsedTime() {
    const now = Date.now();
    const last = Number(state.lastTick || now);
    const elapsed = Math.max(0, now - last);
    const minutes = Math.min(elapsed / 60000, 60 * 24 * 7);

    if (minutes > 0) {
      state.hunger = clamp(state.hunger - minutes * 0.045);
      state.thirst = clamp(state.thirst - minutes * 0.06);
      state.energy = clamp(state.energy - minutes * 0.025);
      state.cleanliness = clamp(state.cleanliness - minutes * 0.012);

      if (state.hunger < 15 || state.thirst < 15) {
        state.health = clamp(state.health - minutes * 0.015);
      } else if (state.hunger > 45 && state.thirst > 45) {
        state.health = clamp(state.health + minutes * 0.004);
      }
    }

    const elapsedDays = Math.floor(
      Math.max(0, now - Number(state.startedAt || now)) / DAY_MS
    );

    state.dayCount = Math.max(1, elapsedDays + 1);
    state.lastTick = now;
  }

  function setMood(mood, thought, message) {
    state.mood = mood;
    state.thought = thought;
    if (message) state.message = message;
    renderMood();
  }

  function showNotice(message) {
    const notice = $("#notice");
    if (!notice) return;

    notice.textContent = message;
    notice.classList.remove("notice-pop");
    void notice.offsetWidth;
    notice.classList.add("notice-pop");

    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.classList.remove("notice-pop");
    }, 450);
  }

  function renderMood() {
    const goat = $("#goat");
    if (!goat) return;

    goat.className = `goat ${state.mood || "idle"}`;

    const thought = $("#thought");
    if (thought) thought.textContent = state.thought || "メェ〜！";

    const moodText = $("#mood");
    const moodIcon = $("#moodIcon");

    if (moodText) {
      moodText.textContent = state.message || "はるはあなたを見ているよ。";
    }

    if (moodIcon) {
      const icons = {
        idle: "💚",
        happy: "💗",
        walk: "🌿",
        sleep: "💤",
        sad: "💧",
        play: "⚽"
      };
      moodIcon.textContent = icons[state.mood] || "💚";
    }
  }

  function renderPet() {
    const petName = $("#petName");
    const petAge = $("#petAge");
    const petLevel = $("#petLevel");

    if (petName) petName.textContent = state.petName;

    if (petAge) {
      petAge.textContent = `子ヤギ・${getAgeText()}`;
    }

    if (petLevel) {
      const months = getAgeMonths();
      if (months < 6) {
        petLevel.textContent = "まだまだ成長中";
      } else if (months < 12) {
        petLevel.textContent = "少しずつ大きくなってきた";
      } else {
        petLevel.textContent = "立派に成長したよ";
      }
    }
  }

  function renderRecords() {
    $("#days").textContent = `${state.dayCount}日目`;
    $("#feedCount").textContent = `${state.feedCount}回`;
    $("#careCount").textContent = `${state.careCount}回`;
    $("#foundCount").textContent = `${state.plants.length}種類`;

    const bookCount = $("#bookCount");
    if (bookCount) bookCount.textContent = `${state.plants.length}種類`;
  }

  function renderPlants() {
    const book = $("#plantBook");
    if (!book) return;

    book.replaceChildren();

    if (!state.plants.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "まだ草花が登録されていないよ。";
      book.appendChild(empty);
      return;
    }

    state.plants.forEach((plant) => {
      const info = plantInfo[plant.name] || plantInfo["不明な植物"];
      const card = document.createElement("article");
      card.className = "plant-card";

      if (plant.photo) {
        const img = document.createElement("img");
        img.src = plant.photo;
        img.alt = `${plant.name}の写真`;
        img.loading = "lazy";
        card.appendChild(img);
      }

      const title = document.createElement("h3");
      title.textContent = plant.name;
      card.appendChild(title);

      const description = document.createElement("p");
      description.textContent = info.description;
      card.appendChild(description);

      const safety = document.createElement("p");
      safety.className = info.toxic ? "plant-warning" : "plant-safe";
      safety.textContent = `注意：${info.safety}`;
      card.appendChild(safety);

      const date = document.createElement("p");
      date.textContent = `登録日：${plant.date || "記録なし"}`;
      card.appendChild(date);

      const remove = document.createElement("button");
      remove.className = "secondary";
      remove.type = "button";
      remove.textContent = "図鑑から削除";
      remove.addEventListener("click", () => {
        if (!confirm(`${plant.name}を図鑑から削除する？`)) return;
        state.plants = state.plants.filter((item) => item.id !== plant.id);
        saveState();
        renderPlants();
        renderRecords();
        showNotice(`${plant.name}を図鑑から削除したよ。`);
      });

      card.appendChild(remove);
      book.appendChild(card);
    });
  }

  function renderAll() {
    renderPet();
    renderRecords();
    renderPlants();
    renderMood();
  }

  function doAction(action) {
    state.careCount += 1;

    switch (action) {
      case "feed":
        changeStat("hunger", 30);
        state.feedCount += 1;
        setMood(
          "happy",
          "おいしい草だね！ メェ〜！",
          "はるはごはんを食べて、うれしそうにしているよ。"
        );
        break;

      case "water":
        changeStat("thirst", 38);
        setMood(
          "happy",
          "お水、おいしいな！",
          "はるは水を飲んで、ほっとしたみたい。"
        );
        break;

      case "pet":
        changeStat("affection", 12);
        changeStat("energy", -2);
        setMood(
          "happy",
          "もっとなでて〜！",
          "はるは気持ちよさそうに目を細めているよ。"
        );
        break;

      case "brush":
        changeStat("cleanliness", 25);
        changeStat("affection", 5);
        setMood(
          "happy",
          "毛がふわふわになったよ！",
          "はるはブラッシングを気に入ったみたい。"
        );
        break;

      case "play":
        changeStat("affection", 8);
        changeStat("energy", -12);
        changeStat("hunger", -5);
        setMood(
          "play",
          "待って〜！ もう一回遊ぼう！",
          "はるはぴょんぴょん跳ねて遊んでいるよ。"
        );
        break;

      case "rest":
        changeStat("energy", 25);
        setMood(
          "sleep",
          "すやすや……",
          "はるは静かな場所で休んでいるよ。"
        );
        break;

      case "clean":
        changeStat("cleanliness", 30);
        setMood(
          "walk",
          "きれいなお部屋だね！",
          "小屋がきれいになって、はるも快適そう。"
        );
        break;

      case "call":
        changeStat("affection", 3);
        setMood(
          "happy",
          "メェ〜！ 呼んだ？",
          "はるはあなたの声に気づいて近づいてきたよ。"
        );
        break;

      case "observe":
        observeGoat();
        state.careCount = Math.max(0, state.careCount - 1);
        break;

      default:
        return;
    }

    saveState();
    renderAll();
    showNotice(state.message);
  }

  function observeGoat() {
    if (state.health < 35) {
      setMood(
        "sad",
        "なんだか具合がよくないよ……",
        "元気がなさそう。現実のヤギなら、獣医さんに相談してね。"
      );
    } else if (state.thirst < 25) {
      setMood(
        "sad",
        "お水がほしいな……",
        "水を飲みたそうにしているよ。"
      );
    } else if (state.hunger < 25) {
      setMood(
        "walk",
        "おなかがすいたよ〜",
        "ごはんを探しているみたい。"
      );
    } else if (state.energy < 20) {
      setMood(
        "sleep",
        "ちょっと眠いな……",
        "疲れているみたい。ゆっくり休ませてあげよう。"
      );
    } else if (state.cleanliness < 25) {
      setMood(
        "walk",
        "体や小屋が汚れてきたよ。",
        "ブラッシングや小屋の掃除をしてあげよう。"
      );
    } else {
      setMood(
        "idle",
        "メェ〜！ 今日はいい気分！",
        "はるは落ち着いて、あなたのそばにいるよ。"
      );
    }
  }

  function registerPlant() {
    const select = $("#plantSelect");
    const name = select.value;

    if (!name) {
      showNotice("先に草花の種類を選んでね。");
      select.focus();
      return;
    }

    const info = plantInfo[name] || plantInfo["不明な植物"];

    const plant = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      photo: currentPhotoData,
      date: new Date().toLocaleDateString("ja-JP")
    };

    state.plants.unshift(plant);
    state.plants = state.plants.slice(0, 100);

    saveState();
    renderPlants();
    renderRecords();

    if (info.toxic) {
      showNotice(
        `⚠️ ${name}は危険な植物として登録したよ。現実のヤギには絶対に食べさせないでね。`
      );
    } else {
      showNotice(`${name}を図鑑に登録したよ！`);
    }

    select.value = "";
    currentPhotoData = null;
    currentPhoto = null;

    const preview = $("#plantPreview");
    preview.removeAttribute("src");
    preview.classList.remove("visible");
    $("#plantPhoto").value = "";
  }

  function handlePhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotice("画像ファイルを選んでね。");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotice("写真が大きすぎるよ。5MB以下の画像を選んでね。");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      currentPhotoData = String(reader.result);
      currentPhoto = file;

      const preview = $("#plantPreview");
      preview.src = currentPhotoData;
      preview.classList.add("visible");
      showNotice("写真を読み込んだよ。植物の種類を選んでね。");
    };

    reader.onerror = () => {
      showNotice("写真を読み込めなかったよ。別の画像を試してね。");
    };

    reader.readAsDataURL(file);
  }

  function renamePet() {
    const name = prompt("ヤギの新しい名前を入力してね。", state.petName);
    if (name === null) return;

    const trimmed = name.trim();
    if (!trimmed) {
      showNotice("名前を入力してね。");
      return;
    }

    state.petName = trimmed.slice(0, 20);
    saveState();
    renderPet();
    showNotice(`これからは「${state.petName}」って呼んでね！`);
  }

  function exportBackup() {
    try {
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "yagi-zukan-backup.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showNotice("バックアップを保存したよ！");
    } catch (error) {
      showNotice("バックアップを作れなかったよ。");
      console.error(error);
    }
  }

  function importBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));

        if (
          !imported ||
          typeof imported !== "object" ||
          !Array.isArray(imported.plants)
        ) {
          throw new Error("データの形式が違います。");
        }

        if (!confirm("今のセーブデータを読み込んだデータに置き換える？")) {
          event.target.value = "";
          return;
        }

        state = {
          ...defaultState(),
          ...imported,
          plants: imported.plants.slice(0, 100),
          plantPhotos: imported.plantPhotos || {}
        };

        state.lastTick = Date.now();
        saveState();
        renderAll();
        showNotice("バックアップを読み込んだよ！");
      } catch (error) {
        showNotice("読み込めなかったよ。有効なバックアップか確認してね。");
        console.error(error);
      } finally {
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      showNotice("ファイルを読み込めなかったよ。");
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function resetGame() {
    const answer = confirm(
      "本当に最初から始める？ セーブデータは消えるよ。"
    );
    if (!answer) return;

    state = defaultState();
    currentPhoto = null;
    currentPhotoData = null;
    saveState();
    renderAll();
    showNotice("新しい牧場生活が始まったよ！");
  }

  function setupEvents() {
    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        doAction(button.dataset.action);
      });
    });

    $("#plantPhoto").addEventListener("change", handlePhoto);
    $("#identifyBtn").addEventListener("click", registerPlant);
    $("#saveBtn").addEventListener("click", () => saveState(true));
    $("#exportBtn").addEventListener("click", exportBackup);
    $("#importBtn").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", importBackup);
    $("#renameBtn").addEventListener("click", renamePet);
    $("#resetBtn").addEventListener("click", resetGame);

    $("#settingsBtn").addEventListener("click", () => {
      showNotice(
        "⚙️ 設定：名前変更、セーブ、バックアップは下の記録エリアから使えるよ。"
      );
      document.querySelector(".records").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        saveState();
      } else {
        updateElapsedTime();
        renderAll();
        saveState();
      }
    });

    window.addEventListener("beforeunload", () => {
      saveState();
    });
  }

  function startGame() {
    updateElapsedTime();
    setupEvents();
    renderAll();
    saveState();

    setInterval(() => {
      updateElapsedTime();
      renderPet();
      renderRecords();

      if (state.health < 35) {
        setMood(
          "sad",
          "なんだか元気が出ないよ……",
          "はるは元気がないみたい。ごはんや水を確認してね。"
        );
      }

      saveState();
    }, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startGame);
  } else {
    startGame();
  }
})();
