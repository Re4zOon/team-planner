// Data storage
let teamMembers = [];
let projects = [];
let assignments = {}; // key: "memberId-weekKey-dayIndex", value: {projectId, hours}
let currentWeekStart = new Date();

// Initialize to Monday of current week
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
currentWeekStart.setHours(0, 0, 0, 0);

// Load data from localStorage
function loadData() {
    const savedMembers = localStorage.getItem('teamMembers');
    const savedProjects = localStorage.getItem('projects');
    const savedAssignments = localStorage.getItem('assignments');
    
    if (savedMembers) teamMembers = JSON.parse(savedMembers);
    if (savedProjects) projects = JSON.parse(savedProjects);
    if (savedAssignments) assignments = JSON.parse(savedAssignments);
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('assignments', JSON.stringify(assignments));
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date
function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Get week key for current week
function getWeekKey(weekStart) {
    return weekStart.toISOString().split('T')[0];
}

// Initialize the app
function init() {
    loadData();
    setupEventListeners();
    renderMembers();
    renderProjects();
    renderPlannerGrid();
    updateWeekDisplay();
}

// Setup event listeners
function setupEventListeners() {
    // Member button
    document.getElementById('addMemberBtn').addEventListener('click', () => {
        openMemberModal();
    });

    // Project button
    document.getElementById('addProjectBtn').addEventListener('click', () => {
        openProjectModal();
    });

    // Week navigation
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderPlannerGrid();
        updateWeekDisplay();
    });

    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderPlannerGrid();
        updateWeekDisplay();
    });

    // Member form
    document.getElementById('memberForm').addEventListener('submit', handleMemberSubmit);

    // Project form
    document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);

    // Assignment form
    document.getElementById('assignmentForm').addEventListener('submit', handleAssignmentSubmit);
    document.getElementById('clearAssignment').addEventListener('click', handleClearAssignment);

    // Modal close buttons
    document.querySelectorAll('.close, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Update week display
function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    document.getElementById('currentWeekDisplay').textContent = 
        `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
}

// Render team members list
function renderMembers() {
    const container = document.getElementById('membersList');
    
    if (teamMembers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No team members yet</p></div>';
        return;
    }

    container.innerHTML = teamMembers.map(member => `
        <div class="item-card">
            <div class="item-info">
                <div class="item-name">${member.name}</div>
                <div class="item-details">
                    Avail: ${member.availability}% | 
                    Eff: ${member.effectiveness}% | 
                    Maint: ${member.maintenance}%
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editMember('${member.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteMember('${member.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render projects list
function renderProjects() {
    const container = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No projects yet</p></div>';
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="item-card project-card" style="--project-color: ${project.color}">
            <div class="item-info">
                <div class="item-name">${project.name}</div>
                <div class="item-details">Total Hours: ${project.hours}h</div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editProject('${project.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render planner grid
function renderPlannerGrid() {
    const container = document.getElementById('plannerGrid');
    
    if (teamMembers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Add team members to start planning</p></div>';
        return;
    }

    const weekKey = getWeekKey(currentWeekStart);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    
    let html = '<table class="grid-table"><thead><tr>';
    html += '<th class="member-header">Team Member</th>';
    
    // Day headers
    for (let i = 0; i < 5; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        html += `<th>${days[i]}<br><small>${formatDate(date)}</small></th>`;
    }
    html += '</tr></thead><tbody>';
    
    // Member rows
    teamMembers.forEach(member => {
        html += '<tr>';
        html += `<td class="member-header">
            <div class="member-header-cell">
                <span class="member-name">${member.name}</span>
                <span class="member-stats">
                    Avail: ${member.availability}% | Eff: ${member.effectiveness}%
                    ${member.maintenance > 0 ? `<br>Maint: ${member.maintenance}%` : ''}
                </span>
            </div>
        </td>`;
        
        // Day cells
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            const cellKey = `${member.id}-${weekKey}-${dayIndex}`;
            const assignment = assignments[cellKey];
            
            html += `<td class="calendar-cell" onclick="openAssignmentModal('${member.id}', ${dayIndex})">`;
            
            if (assignment) {
                const project = projects.find(p => p.id === assignment.projectId);
                if (project) {
                    html += `
                        <div class="assignment" style="background-color: ${project.color}">
                            <div class="assignment-name">${project.name}</div>
                            <div class="assignment-hours">${assignment.hours}h</div>
                        </div>
                    `;
                }
            }
            
            html += '</td>';
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Modal functions
function openMemberModal(memberId = null) {
    const modal = document.getElementById('memberModal');
    const form = document.getElementById('memberForm');
    const title = document.getElementById('memberModalTitle');
    
    form.reset();
    
    if (memberId) {
        const member = teamMembers.find(m => m.id === memberId);
        if (member) {
            title.textContent = 'Edit Team Member';
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberAvailability').value = member.availability;
            document.getElementById('memberEffectiveness').value = member.effectiveness;
            document.getElementById('memberMaintenance').value = member.maintenance;
            form.dataset.editId = memberId;
        }
    } else {
        title.textContent = 'Add Team Member';
        delete form.dataset.editId;
    }
    
    modal.classList.add('active');
}

function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const title = document.getElementById('projectModalTitle');
    
    form.reset();
    
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            title.textContent = 'Edit Project';
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectColor').value = project.color;
            document.getElementById('projectHours').value = project.hours;
            form.dataset.editId = projectId;
        }
    } else {
        title.textContent = 'Add Project';
        delete form.dataset.editId;
    }
    
    modal.classList.add('active');
}

function openAssignmentModal(memberId, dayIndex) {
    const modal = document.getElementById('assignmentModal');
    const form = document.getElementById('assignmentForm');
    const select = document.getElementById('assignProject');
    
    // Populate project dropdown
    select.innerHTML = '<option value="">Select a project...</option>' +
        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    const weekKey = getWeekKey(currentWeekStart);
    const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
    const assignment = assignments[cellKey];
    
    form.reset();
    form.dataset.memberId = memberId;
    form.dataset.dayIndex = dayIndex;
    
    if (assignment) {
        select.value = assignment.projectId;
        document.getElementById('assignHours').value = assignment.hours;
    }
    
    modal.classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Form handlers
function handleMemberSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('memberName').value;
    const availability = parseInt(document.getElementById('memberAvailability').value);
    const effectiveness = parseInt(document.getElementById('memberEffectiveness').value);
    const maintenance = parseInt(document.getElementById('memberMaintenance').value);
    
    const editId = e.target.dataset.editId;
    
    if (editId) {
        const member = teamMembers.find(m => m.id === editId);
        if (member) {
            member.name = name;
            member.availability = availability;
            member.effectiveness = effectiveness;
            member.maintenance = maintenance;
        }
    } else {
        teamMembers.push({
            id: generateId(),
            name,
            availability,
            effectiveness,
            maintenance
        });
    }
    
    saveData();
    renderMembers();
    renderPlannerGrid();
    closeAllModals();
}

function handleProjectSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('projectName').value;
    const color = document.getElementById('projectColor').value;
    const hours = parseFloat(document.getElementById('projectHours').value);
    
    const editId = e.target.dataset.editId;
    
    if (editId) {
        const project = projects.find(p => p.id === editId);
        if (project) {
            project.name = name;
            project.color = color;
            project.hours = hours;
        }
    } else {
        projects.push({
            id: generateId(),
            name,
            color,
            hours
        });
    }
    
    saveData();
    renderProjects();
    renderPlannerGrid();
    closeAllModals();
}

function handleAssignmentSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const memberId = form.dataset.memberId;
    const dayIndex = parseInt(form.dataset.dayIndex);
    const projectId = document.getElementById('assignProject').value;
    const hours = parseFloat(document.getElementById('assignHours').value);
    
    if (!projectId) {
        alert('Please select a project');
        return;
    }
    
    const weekKey = getWeekKey(currentWeekStart);
    const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
    
    assignments[cellKey] = {
        projectId,
        hours
    };
    
    saveData();
    renderPlannerGrid();
    closeAllModals();
}

function handleClearAssignment(e) {
    e.preventDefault();
    
    const form = document.getElementById('assignmentForm');
    const memberId = form.dataset.memberId;
    const dayIndex = parseInt(form.dataset.dayIndex);
    const weekKey = getWeekKey(currentWeekStart);
    const cellKey = `${memberId}-${weekKey}-${dayIndex}`;
    
    delete assignments[cellKey];
    
    saveData();
    renderPlannerGrid();
    closeAllModals();
}

// CRUD operations
function editMember(id) {
    openMemberModal(id);
}

function deleteMember(id) {
    if (confirm('Are you sure you want to delete this team member?')) {
        teamMembers = teamMembers.filter(m => m.id !== id);
        
        // Clean up assignments for this member
        Object.keys(assignments).forEach(key => {
            if (key.startsWith(id + '-')) {
                delete assignments[key];
            }
        });
        
        saveData();
        renderMembers();
        renderPlannerGrid();
    }
}

function editProject(id) {
    openProjectModal(id);
}

function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        
        // Clean up assignments for this project
        Object.keys(assignments).forEach(key => {
            if (assignments[key].projectId === id) {
                delete assignments[key];
            }
        });
        
        saveData();
        renderProjects();
        renderPlannerGrid();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
