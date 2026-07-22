function closeEditModal() {
  const modal = document.getElementById("editActivityModal");

  document.activeElement?.blur();

  bootstrap.Modal.getInstance(modal).hide();
}

function initializeActivity() {
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
      success: refreshCurrentTask,
    });
  });

  $(document).on("click", "#postRemark", function () {
    let message = $("#remarkMessage").val().trim();
    if (message === "") {
      return;
    }
    $.post(
      "/task/" + currentTask + "/remark/",
      {
        message: message,
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        refreshAfter(function () {
          $("#remarkMessage").val("");
        });
      },
    );
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
        refreshAfter();
      },
    );
  });

  $(document).on("click", ".delete-remark", function () {
    if (!confirm("Delete this remark?")) {
      return;
    }
    const id = $(this).data("id");
    $.post(
      "/remark/" + id + "/delete/",
      {
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        refreshAfter();
      },
    );
  });

  $(document).on("click", ".edit-activity", function () {
    editingActivity = null;
    editingActivity = $(this).data("id");

    const message = $(this)
      .closest(".activity-item")
      .find(".activity-message")
      .text()
      .trim();

    $("#editActivityMessage").val(message);

    new bootstrap.Modal(document.getElementById("editActivityModal")).show();
  });

  $(document).on("click", ".edit-remark", function () {
    editingRemark = null;
    editingRemark = $(this).data("id");

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
    if (editingRemark !== null) {
      $.post(
        "/remark/" + editingRemark + "/edit/",
        {
          message: updated,
          csrfmiddlewaretoken: getCsrfToken(),
        },
        function () {
          closeEditModal();
          editingRemark = null;
          refreshAfter();
        },
      );
      return;
    }

    $.post(
      "/activity/" + editingActivity + "/edit/",
      {
        message: updated,
        csrfmiddlewaretoken: getCsrfToken(),
      },
      function () {
        refreshAfter(function () {
          closeEditModal();
          editingActivity = null;
        });
      },
    );
  });
}

$(initializeActivity);
