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

let currentTask = null;
let editingActivity = null;
let editingButton = null;

function getCsrfToken() {
  return $("input[name=csrfmiddlewaretoken]").first().val();
}

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

const allStatusClasses = Object.values(statusClasses);

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

function refreshTaskTable(callback) {
  const query = $("#filterForm").serialize();

  $.ajax({
    url: "/table/",
    type: "GET",
    data: query,
    cache: false,

    success: function (html) {
      $("#taskTableWrapper").replaceWith(html);

      document
        .querySelectorAll("#taskTableWrapper .status-dropdown")
        .forEach(function (dropdown) {
          paintStatusDropdown(dropdown);
        });

      if (typeof callback === "function") {
        callback();
      }
    },

    error: function () {
      alert("Failed to refresh task table.");
    },
  });
}

function refreshTaskDrawer() {
  if (currentTask) {
    loadTaskDrawer(currentTask);
  }
}

function refreshCurrentTask() {
  refreshTaskTable(function () {
    refreshTaskDrawer();
  });
}

$(function () {
  $("#userSelect").select2({
    dropdownParent: $("#assignModal"),
    placeholder: "Search users",
    closeOnSelect: false,
  });

  document.querySelectorAll(".status-dropdown").forEach(function (dropdown) {
    paintStatusDropdown(dropdown);
  });

  $(document).on("submit", "#filterForm", function (e) {
    e.preventDefault();

    refreshTaskTable();
  });

  $(document).on("submit", "#addTaskForm", function (e) {
    e.preventDefault();

    const form = $(this);

    $.ajax({
      url: form.attr("action"),
      type: "POST",
      data: form.serialize(),
      success: function () {
        form[0].reset();
        refreshTaskTable();
      },
      error: function () {
        alert("Failed to create task.");
      },
    });
  });

  $(document).on("click", ".assign-btn", function () {
    currentTask = $(this).data("task");
    const assignedUsers = $(this).data("users");

    $("#assignForm").attr("action", "/assign/" + currentTask + "/");
    $("#userSelect").val(null).trigger("change");

    if (assignedUsers) {
      const ids = assignedUsers.toString().split(",");
      $("#userSelect").val(ids).trigger("change");
    }

    new bootstrap.Modal(document.getElementById("assignModal")).show();
  });

  $("#confirmAssign").click(function () {
    const usernames = $("#userSelect")
      .select2("data")
      .map(function (user) {
        return user.text;
      });

    if (usernames.length === 0) {
      $("#confirmAssignText").html(
        "<strong>No users selected.</strong><br><br>Remove all assignees from this task?",
      );
    } else {
      $("#confirmAssignText").html(
        "Assign <strong>" +
          $(".assign-btn[data-task='" + currentTask + "']").data("title") +
          "</strong><br><br>to:<br><br><strong>" +
          usernames.join(", ") +
          "</strong> ?",
      );
    }

    const assignModal = bootstrap.Modal.getInstance(
      document.getElementById("assignModal"),
    );
    assignModal.hide();

    new bootstrap.Modal(document.getElementById("confirmAssignModal")).show();
  });

  $("#confirmAssignYes").click(function () {
    $.ajax({
      url: $("#assignForm").attr("action"),
      type: "POST",
      data: $("#assignForm").serialize(),
      success: function () {
        bootstrap.Modal.getInstance(
          document.getElementById("confirmAssignModal"),
        ).hide();
        refreshTaskTable();
      },
      error: function () {
        alert("Failed to update assignees.");
      },
    });
  });

  const drawer = new bootstrap.Offcanvas(document.getElementById("taskDrawer"));

  function buildActivityHtml(task) {
    if (task.activities.length === 0) {
      return `
      <p class="text-muted">
        No activity yet.
      </p>
    `;
    }

    let html = "";

    task.activities.forEach(function (activity) {
      let attachments = "";

      activity.attachments.forEach(function (file) {
        attachments += `
        <div class="mt-2">
          <a href="${file.url}" target="_blank">
            📎 ${file.name}
          </a>
        </div>
      `;
      });

      let buttons = "";

      if (activity.type === "COMMENT" && activity.owner === task.current_user) {
        buttons += `
        <button
          class="btn btn-sm btn-outline-primary edit-activity"
          data-id="${activity.id}">
          Edit
        </button>
      `;
      }

      if (activity.owner === task.current_user || task.is_owner) {
        buttons += `
        <button
          class="btn btn-sm btn-outline-danger delete-activity"
          data-id="${activity.id}">
          Delete
        </button>
      `;
      }

      html += `
      <div class="activity-item">

        <small>${activity.time}</small>

        <br>

        <strong>${activity.user}</strong>

        <p class="activity-message mt-2">
          ${activity.message}
        </p>

        ${attachments}

        <br><br>

        ${buttons}

      </div>
    `;
    });

    return html;
  }

  function renderTaskDrawer(task) {
    let users = "";

    task.assignees.forEach(function (name) {
      users += `
      <span class="badge bg-primary me-1">
        ${name}
      </span>
    `;
    });

    $("#drawerTitle").text(task.title);

    $("#drawerContent").html(`
    <div class="drawer-section">
      <h6>Status</h6>
      <p>${task.status}</p>
    </div>

    <div class="drawer-section">
      <h6>Company</h6>
      <p>${task.company}</p>
    </div>

    <div class="drawer-section">
      <h6>Deadline</h6>
      <p>${task.deadline}</p>
    </div>

    <div class="drawer-section">
      <h6>Owner</h6>
      <p>${task.owner}</p>
    </div>

    <div class="drawer-section">
      <h6>Assigned Users</h6>
      ${users}
    </div>

    <div class="drawer-section">
      <h6>Description</h6>
      <p>${task.details}</p>
    </div>

    <hr>

    <div class="drawer-section">
      <h6>Activity</h6>
      ${buildActivityHtml(task)}
    </div>
  `);

    $("#drawerFooter").html(`

      <h6>Progress Update</h6>

      <textarea
        id="progressMessage"
        class="form-control"
        rows="4"
        placeholder="Write your progress update...">
      </textarea>

      <button
        class="btn btn-success mt-3"
        id="postUpdate">
        Post Update
      </button>
      <div class="upload-actions">
          <label for="progressFiles" class="custom-upload">
              <div class="upload-icon">
                  <i class="bi bi-cloud-arrow-up-fill"></i>
              </div>
              <div class="upload-text">
                  <h6>Upload Attachments</h6>
                  <small>
                      JPG • PNG • PDF • DOCX • XLSX • ZIP
                      <br>
                      <strong>Maximum 10 MB per file</strong>
                  </small>
              </div>
          </label>
          
      </div>

          <input
              type="file"
              id="progressFiles"
              multiple
              hidden>
          <div id="selectedFiles" class="mt-3"></div>

          <input
              type="file"
              id="progressFiles"
              multiple
              hidden>
          <div id="selectedFiles"></div>

  `);
  }

  function loadTaskDrawer(taskId) {
    currentTask = taskId;

    $("#drawerTitle").text("Loading...");
    $("#drawerContent").html("<p>Loading task...</p>");

    drawer.show();

    $.get("/task/" + taskId + "/data/", function (task) {
      renderTaskDrawer(task);
    });

    $("#notification-" + taskId)
      .removeClass("bg-danger")
      .addClass("bg-success")
      .text("Seen");
  }

  $(document).on("click", "#postUpdate", function () {
    let message = $("#progressMessage").val();

    if (message.trim() === "" && $("#progressFiles")[0].files.length === 0) {
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

    let files = $("#progressFiles")[0].files;

    // Validate every file BEFORE uploading
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        alert(`"${files[i].name}" exceeds the 10 MB limit.`);

        return;
      }
    }
    let formData = new FormData();
    formData.append("message", message);
    formData.append(
      "csrfmiddlewaretoken",
      $("input[name=csrfmiddlewaretoken]").first().val(),
    );
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
  });

  $(document).on("click", "#resetFilters", function (e) {
    const form = $("#filterForm");

    form[0].reset();

    refreshTaskTable();
  });

  $(document).on("click", ".task-link", function (e) {
    e.preventDefault();

    loadTaskDrawer($(this).data("task"));
  });

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
        refreshTaskTable(function () {
          if (String(currentTask) === String(dropdown.dataset.task)) {
            refreshTaskDrawer();
          }
        });
      },

      error: function () {
        dropdown.dataset.status = oldStatus;

        paintStatusDropdown(dropdown);

        alert("Couldn't save status.");
      },
    });
  });

  $(document).on("click", ".delete-task", function (e) {
    e.preventDefault();

    if (!confirm("Delete this task?")) {
      return;
    }

    const link = $(this);

    $.post(
      link.attr("href"),
      {
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        if (currentTask && String(currentTask) === String(link.data("task"))) {
          drawer.hide();
          currentTask = null;
        }

        refreshTaskTable();
      },
    );
  });

  $(document).on("click", "#postUpdate", function () {
    const message = $("#progressMessage").val();

    if (message.trim() === "" && $("#progressFiles")[0].files.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append("message", message);
    formData.append("csrfmiddlewaretoken", getCsrfToken());

    const files = $("#progressFiles")[0].files;
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    $.ajax({
      url: "/task/" + currentTask + "/comment/",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function () {
        refreshCurrentTask();
      },
    });
  });

  $(document).on("change", "#progressFiles", function () {
    const MAX_SIZE = 10 * 1024 * 1024;

    let html = "";

    for (let file of this.files) {
      if (file.size > MAX_SIZE) {
        alert(`${file.name} exceeds the 10 MB limit.`);
        this.value = "";
        $("#selectedFiles").html("");
        return;
      }
      let size = (file.size / 1024 / 1024).toFixed(2);
      html += `
            <div class="selected-file">
                <div class="file-left">
                    <i class="bi bi-file-earmark"></i>
                    <div>
                        <div class="file-name">
                            ${file.name}
                        </div>
                        <div class="file-size">
                            ${size} MB
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    $("#selectedFiles").html(html);
  });

  $(document).on("click", ".delete-activity", function () {
    if (!confirm("Delete this activity?")) {
      return;
    }

    const id = $(this).data("id");

    $.post(
      "/activity/" + id + "/delete/",
      {
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        refreshCurrentTask();
      },
    );
  });

  $(document).on("click", ".edit-activity", function () {
    editingActivity = $(this).data("id");
    editingButton = $(this);

    const message = $(this)
      .closest(".activity-item")
      .find(".activity-message")
      .text()
      .trim();

    $("#editActivityMessage").val(message);

    new bootstrap.Modal(document.getElementById("editActivityModal")).show();
  });

  $(document).on("click", "#saveActivityEdit", function () {
    const updated = $("#editActivityMessage").val();

    $.post(
      "/activity/" + editingActivity + "/edit/",
      {
        message: updated,
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        bootstrap.Modal.getInstance(
          document.getElementById("editActivityModal"),
        ).hide();

        refreshCurrentTask();
      },
    );
  });

  document.querySelectorAll(".auto-expand").forEach(function (textarea) {
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });
  });

  $("#filterToggle").click(function () {
    $("#filterPanel").toggleClass("show");
  });
});
