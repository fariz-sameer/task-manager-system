const statusColors = {
  NEW: {
    bg: "#C4F9CC",
    fg: "#000",
  },
  URGENT: {
    bg: "#FF3B30",
    fg: "#fff",
  },
  IN_PROGRESS: {
    bg: "#FFC107",
    fg: "#000",
  },
  PENDING: {
    bg: "#2196F3",
    fg: "#fff",
  },
  FOR_DISCUSSION: {
    bg: "#FF9800",
    fg: "#fff",
  },
  NOT_READY: {
    bg: "#E4E4E4",
    fg: "#000",
  },
  FINISHED: {
    bg: "#9C27B0",
    fg: "#fff",
  },
  COMPLETED: {
    bg: "#28A745",
    fg: "#fff",
  },
  CLOSED_TO_REOPEN: {
    bg: "#343A40",
    fg: "#fff",
  },
  CANCELLED: {
    bg: "#6C757D",
    fg: "#fff",
  },
};

let currentTask = null;
let editingActivity = null;
let editingButton = null;

function getCsrfToken() {
  return $("input[name=csrfmiddlewaretoken]").first().val();
}

function paintStatusDropdown(dropdown) {
  const status = dropdown.dataset.status;

  const color = statusColors[status];

  if (!color) {
    return;
  }

  const button = dropdown.querySelector(".status-button");

  const selectedItem = dropdown.querySelector(
    `.status-item[data-status="${status}"]`,
  );

  button.textContent = selectedItem ? selectedItem.textContent.trim() : status;

  button.style.backgroundColor = color.bg;
  button.style.color = color.fg;

  dropdown.querySelectorAll(".status-item").forEach(function (item) {
    item.classList.remove("active");

    const itemColor = statusColors[item.dataset.status];

    if (itemColor) {
      item.style.backgroundColor = itemColor.bg;
      item.style.color = itemColor.fg;
    }

    if (item.dataset.status === status) {
      item.classList.add("active");
    }
  });
}

function refreshTaskTable(callback) {
  $.get(window.location.href, function (html) {
    $("#taskTableWrapper").html($(html).find("#taskTableWrapper").html());
    document
      .querySelectorAll("#taskTableWrapper .status-dropdown")
      .forEach(function (dropdown) {
        paintStatusDropdown(dropdown);
      });

    if (typeof callback === "function") {
      callback();
    }
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

  $(document).on("click", ".task-link", function (e) {
    e.preventDefault();

    const taskId = $(this).data("task");
    currentTask = taskId;

    $("#drawerTitle").text("Loading...");
    $("#drawerContent").html("<p>Loading task...</p>");
    drawer.show();

    $.get("/task/" + taskId + "/data/", function (task) {
      $("#drawerTitle").text(task.title);

      let users = "";
      task.assignees.forEach(function (name) {
        users += "<span class='badge bg-primary me-1'>" + name + "</span>";
      });

      let activityHtml = "";
      if (task.activities.length === 0) {
        activityHtml = `
                    <p class="text-muted">
                        No activity yet.
                    </p>
                `;
      } else {
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

          if (activity.type === "COMMENT") {
            if (activity.owner === task.current_user) {
              buttons += `
                                <button
                                    class="btn btn-sm btn-outline-primary edit-activity"
                                    data-id="${activity.id}">
                                    Edit
                                </button>
                            `;
            }
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

          activityHtml += `
                        <div class="activity-item">
                            <small>${activity.time}</small>
                            <br>
                            <strong>${activity.user}</strong>
                            <p class="activity-message mt-2">${activity.message}</p>
                            ${attachments}
                            <br><br>
                            ${buttons}
                        </div>
                    `;
        });
      }

      $("#drawerContent").html(
        `
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
                    ${activityHtml}
                </div>
                <hr>
                <div class="drawer-section">
                    <h6>Progress Update</h6>
                    <textarea id="progressMessage" class="form-control" rows="4"></textarea>
                    <input type="file" id="progressFiles" multiple class="form-control mt-3">
                    <button class="btn btn-success mt-3" id="postUpdate">Post Update</button>
                </div>
                `,
      );
    });

    $("#notification-" + taskId)
      .removeClass("bg-danger")
      .addClass("bg-success")
      .text("Seen");
  });

  $(document).on("click", ".status-button", function (e) {
    e.stopPropagation();

    const dropdown = $(this).closest(".status-dropdown");

    $(".status-dropdown").not(dropdown).removeClass("open");

    dropdown.toggleClass("open");
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
        if (window.currentTask == dropdown.dataset.task) {
          $(".task-link[data-task='" + window.currentTask + "']").click();
        }
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
        if (
          window.currentTask &&
          String(window.currentTask) === String(link.data("task"))
        ) {
          drawer.hide();
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
      url: "/task/" + window.currentTask + "/comment/",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function () {
        $(".task-link[data-task='" + window.currentTask + "']").click();
      },
    });
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
        $(".task-link[data-task='" + window.currentTask + "']").click();
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

        $(".task-link[data-task='" + window.currentTask + "']").click();
      },
    );
  });

  document.querySelectorAll("#readonly-status").forEach(function (status) {
    switch (status.innerText.trim()) {
      case "New":
        status.style.background = "#C4F9CC";
        break;
      case "Urgent":
        status.style.background = "#FF3B30";
        status.style.color = "white";
        break;
      case "Completed":
        status.style.background = "#198754";
        status.style.color = "white";
        break;
      case "Closed to Reopen":
        status.style.background = "#343A40  ";
        status.style.color = "white";
        break;
      case "Cancelled":
        status.style.background = "#6C757D";
        status.style.color = "white";
        break;
    }
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
