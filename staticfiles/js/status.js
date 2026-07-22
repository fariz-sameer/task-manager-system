const statusClasses = {
  NEW: "status-new",
  URGENT: "status-urgent",
  IN_PROGRESS: "status-in-progress",
  PENDING: "status-pending",
  FOR_DISCUSSION: "status-for-discussion",
  NOT_READY: "status-not-ready",
  FINISHED: "status-finished",
  COMPLETED: "status-completed",
  CLOSED_TO_REOPEN: "status-closed",
  CANCELLED: "status-cancelled",
};

const allStatusClasses = Object.values(statusClasses);

function positionStatusMenu(dropdown) {
  const menu = dropdown.querySelector(".status-menu");

  dropdown.classList.remove("open-up");

  const rect = dropdown.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const menuHeight = menu.scrollHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    dropdown.classList.add("open-up");
  }
}

function paintStatusDropdown(dropdown) {
  const status = dropdown.dataset.status;

  const button = dropdown.querySelector(".status-button");

  const selectedItem = dropdown.querySelector(
    `.status-item[data-status="${status}"]`,
  );

  button.textContent = selectedItem
    ? selectedItem.textContent.trim()
    : status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

  // remove all status classes
  allStatusClasses.forEach(function (cls) {
    button.classList.remove(cls);
  });

  const buttonClass = statusClasses[status];

  if (buttonClass) {
    button.classList.add(buttonClass);
  }

  dropdown.querySelectorAll(".status-item").forEach(function (item) {
    item.classList.remove("active");

    allStatusClasses.forEach(function (cls) {
      item.classList.remove(cls);
    });

    const itemClass = statusClasses[item.dataset.status];

    if (itemClass) {
      item.classList.add(itemClass);
    }

    if (item.dataset.status === status) {
      item.classList.add("active");
    }
  });
}

function initializeStatus() {
  $(document).on("click", ".status-button", function (e) {
    const dropdown = $(this).closest(".status-dropdown");

    if (dropdown.hasClass("readonly")) {
      return;
    }

    e.stopPropagation();

    $(".status-dropdown").not(dropdown).removeClass("open");

    if (!dropdown.hasClass("open")) {
      positionStatusMenu(dropdown[0]);
    }

    dropdown.toggleClass("open");

    if (dropdown.hasClass("open")) {
      const activeItem = dropdown.find(".status-item.active")[0];

      if (activeItem) {
        activeItem.scrollIntoView({
          block: "nearest",
        });
      }
    }
  });

  $(document).on("click", function () {
    $(".status-dropdown").removeClass("open");
  });

  $(document).on("click", ".status-menu", function (e) {
    e.stopPropagation();
  });

  $(document).on("click", ".status-item", function (e) {
    e.stopPropagation();

    const item = this;

    const dropdown = item.closest(".status-dropdown");

    const oldStatus = dropdown.dataset.status;

    const newStatus = item.dataset.status;

    if (oldStatus === newStatus) {
      dropdown.classList.remove("open");

      return;
    }

    dropdown.dataset.status = newStatus;

    paintStatusDropdown(dropdown);

    dropdown.classList.remove("open");

    $.ajax({
      url: "/status/" + dropdown.dataset.task + "/",

      type: "POST",

      data: {
        status: newStatus,

        csrfmiddlewaretoken: getCsrfToken(),
      },

      success: function () {
        const isCurrentTask =
          String(currentTask) === String(dropdown.dataset.task);

        if (isCurrentTask) {
          refreshCurrentTask();
          return;
        }
        refreshTaskTable();
      },

      error: function () {
        dropdown.dataset.status = oldStatus;

        paintStatusDropdown(dropdown);

        alert("Couldn't save status.");
      },
    });
  });
}

$(initializeStatus);
