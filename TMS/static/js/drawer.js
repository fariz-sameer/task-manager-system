function buildDrawerFooter(task) {
  if (task.is_follower) {
    return `

            <div class="drawer-action-card">

                <div class="drawer-action-header">

                    <div>

                        <h6>

                            <i class="bi bi-chat-dots-fill"></i>

                            Discussion

                        </h6>

                        <small>

                            Click to leave a remark

                        </small>

                    </div>

                    <i class="bi bi-chevron-down action-arrow"></i>

                </div>

                <div class="drawer-action-body">

                    <textarea
                        id="remarkMessage"
                        class="form-control"
                        rows="4"
                        placeholder="Write your thoughts..."></textarea>

                    <button
                        class="btn btn-success mt-3"
                        id="postRemark">

                        <i class="bi bi-send-fill"></i>

                        Post Remark

                    </button>

                </div>

            </div>

            `;
  } else {
    return `

            <div class="drawer-action-card">

                <div class="drawer-action-header">

                    <div>

                        <h6>

                            <i class="bi bi-pencil-square"></i>

                            Progress Update

                        </h6>

                        <small>

                            Click to write an update

                        </small>

                    </div>

                    <i class="bi bi-chevron-down action-arrow"></i>

                </div>

                <div class="drawer-action-body">

                    <textarea
                        id="progressMessage"
                        class="form-control"
                        rows="4"
                        placeholder="Write your progress updates..."></textarea>

                    <div class="upload-actions">

                        <label for="progressFiles" class="custom-upload">

                            <div class="upload-icon">

                                <i class="bi bi-cloud-arrow-up-fill"></i>

                            </div>

                            <div class="upload-text">

                                <h6>

                                    Upload Attachments

                                </h6>

                                <small>

                                    JPG • PNG • PDF • DOCX • XLSX • ZIP

                                    <br>

                                    <strong>Maximum 10 MB total</strong>

                                </small>

                            </div>

                        </label>

                        <button
                            class="btn btn-success"
                            id="postUpdate">

                            <i class="bi bi-send-fill"></i>

                            Post Update

                        </button>

                    </div>

                    <input
                        type="file"
                        id="progressFiles"
                        multiple
                        hidden>

                    <div
                        id="selectedFiles"
                        class="mt-3">

                    </div>

                </div>

            </div>

            `;
  }
}

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

function buildRemarkHtml(task) {
  if (task.remarks.length === 0) {
    return `
            <p class="text-muted">
                No remarks yet.
            </p>
        `;
  }

  let html = "";

  task.remarks.forEach(function (remark) {
    let buttons = "";

    if (remark.can_edit) {
      buttons += `
                    <button
                        class="btn btn-sm btn-outline-primary edit-remark"
                        data-id="${remark.id}">
                        Edit
                    </button>
                `;
    }

    if (remark.can_delete) {
      buttons += `
                    <button
                        class="btn btn-sm btn-outline-danger delete-remark"
                        data-id="${remark.id}">
                        Delete
                    </button>
                `;
    }

    html += `

              <div class="activity-item">

                  <small>${remark.time}</small>

                  <br>

                  <strong>${remark.user}</strong>

                  <p class="activity-message mt-2">

                      ${remark.message}

                  </p>

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

  let followers = "";
  task.followers.forEach(function (name) {
    followers += `
              <span class="badge bg-secondary me-1">
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
        <h6>Followers</h6>
        ${followers}
    </div>

    <div class="drawer-section">
      <h6>Description</h6>
      <p>${task.details}</p>
    </div>

    <hr class="drawer-hr">

    <div class="drawer-columns">
      <div class="activity-column">
          <h6>
          <i class="bi bi-clock-history"></i>
          Activity</h6>
          ${buildActivityHtml(task)}
      </div>
      <div class="remarks-column">
          <h6>
          <i class="bi bi-chat-dots"></i>
          Follower Remarks</h6>
          ${buildRemarkHtml(task)}
      </div>
  </div>
  `);
}

function loadTaskDrawer(taskId) {
  currentTask = taskId;

  $("#drawerTitle").text("Loading...");
  $("#drawerContent").html("<p>Loading task...</p>");

  drawer.show();

  $.ajax({
    url: "/task/" + taskId + "/data/",

    type: "GET",

    cache: false,

    success: function (task) {
      $("#drawerFooter").html(buildDrawerFooter(task));
      renderTaskDrawer(task);
    },
  });

  $("#notification-" + taskId)
    .removeClass("bg-danger")
    .addClass("bg-success")
    .text("Seen");
}

function refreshTaskDrawer() {
  if (currentTask) {
    loadTaskDrawer(currentTask);
  }
}

function refreshCurrentTask() {
  refreshTaskTable().done(refreshTaskDrawer);
}

function refreshAfter(successCallback = null) {
  refreshTaskTable().done(function () {
    refreshTaskDrawer();

    if (typeof successCallback === "function") {
      successCallback();
    }
  });
}
