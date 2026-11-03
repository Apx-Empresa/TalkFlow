// TaskFlow: gerenciamento de tarefas com armazenamento local.
const STORAGE_KEY = "taskflow_tarefas";

let tasks = loadTasks();
let editingId = null;
let toastTimer;

const elements = {
  modal: document.getElementById("taskModal"),
  form: document.getElementById("taskForm"),
  title: document.getElementById("taskTitle"),
  description: document.getElementById("taskDescription"),
  priority: document.getElementById("taskPriority"),
  due: document.getElementById("taskDue"),
  search: document.getElementById("searchInput"),
  priorityFilter: document.getElementById("priorityFilter"),
  statusFilter: document.getElementById("statusFilter"),
  toast: document.getElementById("toast")
};

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Não foi possível carregar as tarefas:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Não foi possível salvar as tarefas:", error);
    showToast("Erro ao salvar. Verifique o armazenamento do navegador.");
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(dateString) {
  if (!dateString) return "Sem prazo";
  const parts = dateString.split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isOverdue(task) {
  if (!task.due || task.status === "concluida") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.due}T00:00:00`);
  return due < today;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function openModal(task = null) {
  editingId = task ? task.id : null;
  document.getElementById("modalTitle").textContent = task ? "Editar tarefa" : "Nova tarefa";
  document.getElementById("saveTaskBtn").textContent = task ? "Salvar alterações" : "Salvar tarefa";
  elements.title.value = task ? task.title : "";
  elements.description.value = task ? task.description : "";
  elements.priority.value = task ? task.priority : "media";
  elements.due.value = task ? task.due : "";
  elements.modal.classList.add("open");
  elements.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.title.focus(), 50);
}

function closeModal() {
  elements.modal.classList.remove("open");
  elements.modal.setAttribute("aria-hidden", "true");
  elements.form.reset();
  editingId = null;
}

function getFilteredTasks() {
  const search = elements.search.value.trim().toLocaleLowerCase("pt-BR");
  const priority = elements.priorityFilter.value;
  const status = elements.statusFilter.value;
  return tasks.filter(task => {
    const matchesTitle = task.title.toLocaleLowerCase("pt-BR").includes(search);
    const matchesPriority = !priority || task.priority === priority;
    const matchesStatus = !status || task.status === status;
    return matchesTitle && matchesPriority && matchesStatus;
  });
}

function renderTask(task) {
  const card = document.createElement("article");
  card.className = "task-card";

  const title = document.createElement("h4");
  title.textContent = task.title;
  card.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    card.appendChild(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = `Prioridade ${task.priority}`;
  const due = document.createElement("span");
  due.className = `due ${isOverdue(task) ? "overdue" : ""}`;
  due.textContent = `${isOverdue(task) ? "Atrasada • " : ""}${formatDate(task.due)}`;
  meta.append(priority, due);
  card.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const statusButton = document.createElement("button");
  statusButton.type = "button";
  statusButton.textContent = task.status === "pendente" ? "Iniciar →" : task.status === "andamento" ? "Concluir ✓" : "↶ Reabrir";
  statusButton.addEventListener("click", () => changeStatus(task.id));
  actions.appendChild(statusButton);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Editar";
  editButton.addEventListener("click", () => openModal(task));
  actions.appendChild(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Excluir";
  deleteButton.addEventListener("click", () => deleteTask(task.id));
  actions.appendChild(deleteButton);

  card.appendChild(actions);
  return card;
}

function renderList(containerId, list) {
  const container = document.getElementById(containerId);
  container.replaceChildren();
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma tarefa por aqui.";
    container.appendChild(empty);
    return;
  }
  list.forEach(task => container.appendChild(renderTask(task)));
}

function render() {
  const filtered = getFilteredTasks();
  const todo = filtered.filter(task => task.status === "pendente");
  const doing = filtered.filter(task => task.status === "andamento");
  const done = filtered.filter(task => task.status === "concluida");

  renderList("todoList", todo);
  renderList("doingList", doing);
  renderList("doneList", done);

  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent = tasks.filter(t => t.status === "pendente").length;
  document.getElementById("progressCount").textContent = tasks.filter(t => t.status === "andamento").length;
  document.getElementById("doneCount").textContent = tasks.filter(t => t.status === "concluida").length;
  document.getElementById("todoCount").textContent = todo.length;
  document.getElementById("doingCount").textContent = doing.length;
  document.getElementById("doneColumnCount").textContent = done.length;
}

function changeStatus(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  const next = { pendente: "andamento", andamento: "concluida", concluida: "pendente" };
  task.status = next[task.status] || "pendente";
  saveTasks();
  render();
  showToast("Status da tarefa atualizado!");
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  if (!confirm(`Deseja realmente excluir "${task.title}"?`)) return;
  tasks = tasks.filter(item => item.id !== id);
  saveTasks();
  render();
  showToast("Tarefa excluída.");
}

elements.form.addEventListener("submit", event => {
  event.preventDefault();
  const title = elements.title.value.trim();
  if (!title) {
    elements.title.focus();
    showToast("Digite um título para a tarefa.");
    return;
  }

  const taskData = {
    title,
    description: elements.description.value.trim(),
    priority: elements.priority.value,
    due: elements.due.value,
    status: "pendente"
  };

  if (editingId) {
    const existing = tasks.find(task => task.id === editingId);
    if (!existing) return;
    existing.title = taskData.title;
    existing.description = taskData.description;
    existing.priority = taskData.priority;
    existing.due = taskData.due;
    showToast("Tarefa atualizada!");
  } else {
    tasks.unshift({ id: createId(), ...taskData });
    showToast("Tarefa cadastrada!");
  }

  saveTasks();
  closeModal();
  render();
});

document.getElementById("newTaskTop").addEventListener("click", () => openModal());
document.getElementById("newTaskBoard").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
elements.modal.addEventListener("click", event => {
  if (event.target === elements.modal) closeModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && elements.modal.classList.contains("open")) closeModal();
});

[elements.search, elements.priorityFilter, elements.statusFilter].forEach(control => {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
});
document.getElementById("clearFilters").addEventListener("click", () => {
  elements.search.value = "";
  elements.priorityFilter.value = "";
  elements.statusFilter.value = "";
  render();
  showToast("Filtros limpos.");
});

const today = new Date();
document.getElementById("todayLabel").textContent = today.toLocaleDateString("pt-BR", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric"
});
render();
