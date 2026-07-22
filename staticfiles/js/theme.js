function applyTheme(isDark) {
  $("body").toggleClass("dark-mode", isDark);

  document.getElementById("dark-theme").disabled = !isDark;

  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function initializeTheme() {
  const dark = localStorage.getItem("theme") === "dark";

  $("#themeToggle")
    .prop("checked", dark)
    .on("change", function () {
      applyTheme(this.checked);
    });

  applyTheme(dark);
}

$(initializeTheme);
