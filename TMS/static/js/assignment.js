function initializeAssignment() {
  $("#userSelect").select2({
    dropdownParent: $("#assignModal"),
    placeholder: "Search users",
    closeOnSelect: false,
  });
  $("#userSelect").on("change", function () {
    let assignees = $(this).val() || [];

    let followers = $("#followerSelect").val() || [];

    followers = followers.filter((id) => !assignees.includes(id));

    $("#followerSelect").val(followers).trigger("change.select2");
  });

  $("#followerSelect").select2({
    dropdownParent: $("#assignModal"),
    placeholder: "Select followers",
    closeOnSelect: false,
  });
  $("#followerSelect").on("change", function () {
    let followers = $(this).val() || [];

    let assignees = $("#userSelect").val() || [];

    assignees = assignees.filter((id) => !followers.includes(id));

    $("#userSelect").val(assignees).trigger("change.select2");
  });

  $(document).on("click", ".assign-btn", function () {
    currentTask = $(this).data("task");
    const assignedUsers = $(this).data("users");
    const followerUsers = $(this).data("followers");

    $("#assignForm").attr("action", "/assign/" + currentTask + "/");
    $("#userSelect").val(null).trigger("change");

    if (assignedUsers) {
      const ids = assignedUsers.toString().split(",");
      $("#userSelect").val(ids).trigger("change");
    }

    $("#followerSelect").val(null).trigger("change");

    if (followerUsers) {
      let ids = followerUsers.toString().split(",");

      $("#followerSelect").val(ids).trigger("change");
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
}

$(initializeAssignment);
