window.onload = gernerateTodos();

function gernerateTodos() {
  axios
    .get("/readitem")
    .then((res) => {
      console.log(res.data);

      if (res.data.status !== 200) {
        return alert(res.data.message);
      }

      const todos = res.data.data;
      document.getElementById("item_list").insertAdjacentHTML(
        "beforeend",
        todos
          .map((item) => {
            return `
          <li class="card-body d-flex justify-content-between px-3 py-2 border align-items-center">
            <span class="item-text">${item.todo}</span>
            <div>
              <button class="edit-me btn-primary btn-sm mx-1" data-id="${item._id}">Edit</button>
              <button class="delete-me btn-danger btn-sm" data-id="${item._id}">Delete</button>
            </div>
          </li>
        
        `;
          })
          .join("")
      );
    })
    .catch((err) => console.log(err));
}

document.addEventListener("click", (event) => {
  if (event.target.classList.contains("edit-me")) {
    const todoId = event.target.getAttribute("data-id");
    const newData = prompt("enter new todo data");

    axios
      .post("/edititem", { newData, todoId })
      .then((res) => {
        if (res.data.status !== 200) {
          return alert(res.data.message);
        }

        event.target.parentElement.parentElement.querySelector(
          ".item-text"
        ).innerHTML = newData;
      })
      .catch((err) => console.log(err));
  } else if (event.target.classList.contains("delete-me")) {
    const todoId = event.target.getAttribute("data-id");

    axios
      .post("/deleteitem", { todoId })
      .then((res) => {
        if (res.data.status !== 200) {
          return alert(res.data.message);
        }

        event.target.parentElement.parentElement.remove();
      })
      .catch((err) => console.log(err));
  } else if (event.target.classList.contains("add-item")) {
    const todo = document.getElementById("create-field").value;

    axios
      .post("/createitem", { todo })
      .then((res) => {
        if (res.data.status !== 201) {
          return alert(res.data.message);
        }
        document.getElementById("create-field").value = "";

        document.getElementById("item_list").insertAdjacentHTML(
          "beforeend",
          `
          <li class="card-body d-flex justify-content-between px-3 py-2 border align-items-center">
            <span class="item-text">${res.data.data.todo}</span>
            <div>
              <button
                class="edit-me btn-primary btn-sm mx-1"
                data-id="${res.data.data._id}"
              >
                Edit
              </button>
              <button class="delete-me btn-danger btn-sm" data-id="${res.data.data._id}">
                Delete
              </button>
            </div>
          </li>`
        );
      })
      .catch((err) => console.log(err));
  } else if (event.target.classList.contains("logout")) {
    axios
      .post("/logout")
      .then((res) => {
        window.location.href = "/loginform";
      })
      .catch((err) => console.log(err));
  } else if (event.target.classList.contains("logoutall")) {
    axios
      .post("/logoutall")
      .then((res) => {
        window.location.href = "/loginform";
      })
      .catch((err) => console.log(err));
  }
});
