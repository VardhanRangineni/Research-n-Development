import { projectsService } from './projects.service';
import { benchmarkService } from './benchmark.service';
import { notificationsService } from './notifications.service';
import { equipmentService } from './equipment.service';
import { batchFormulaService } from './batch-formula.service';

const MAX_PROJECT_BATCH_CALLS = 30;

const FALLBACK = {
    head: {
        kpis: [
            { title: 'Total Active Projects', value: 12 },
            { title: 'Projects In Stability', value: 4 },
            { title: 'Projects In Documentation', value: 3 },
            { title: 'Stopped Projects', value: 2 }
        ],
        risk: [
            { title: 'Overdue Stability Observations', value: 2 },
            { title: 'Pending Batch Decisions', value: 4 }
        ]
    },
    manager: {
        kpis: [
            { title: 'My Team Active Projects', value: 8 },
            { title: 'Pending Approvals', value: 5 },
            { title: 'Due Today Tasks', value: 3 },
            { title: 'Calibration Due This Week', value: 2 }
        ]
    },
    executive: {
        kpis: [
            { title: 'My Open Tasks', value: 6 },
            { title: 'My Overdue Tasks', value: 1 },
            { title: 'My Completed This Week', value: 4 },
            { title: 'My Pending Calibrations', value: 1 }
        ]
    }
};

const safe = async (promise, fallbackValue) => {
    try {
        return await promise;
    } catch {
        return fallbackValue;
    }
};

const toIsoDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const countBy = (items, keySelector) => {
    return items.reduce((acc, item) => {
        const key = keySelector(item);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
};

const getPendingBatchCount = async (projects) => {
    const selected = projects.slice(0, MAX_PROJECT_BATCH_CALLS);
    const responses = await Promise.all(
        selected.map((project) => safe(batchFormulaService.getAllByProject(project.id), []))
    );

    const allBatches = responses.flat().filter(Boolean);
    return allBatches.filter((item) => String(item?.status || '').toUpperCase() === 'PENDING').length;
};

const buildHeadData = async (projects, benchmarks, notifications) => {
    const stageCounts = countBy(projects, (item) => String(item?.lifecycleStage || 'UNKNOWN').toUpperCase());

    const activeProjects = projects.filter(
        (item) => String(item?.status || '').toUpperCase() !== 'STOPPED'
    ).length;

    const inStability = stageCounts.STABILITY || 0;
    const inDocumentation = stageCounts.DOCUMENTATION || 0;

    const stoppedProjects = benchmarks.filter(
        (item) => String(item?.status || '').toUpperCase() === 'STOPPED'
    ).length;

    const overdueCount = notifications.filter(
        (item) => String(item?.type || '').toUpperCase() === 'OVERDUE'
    ).length;

    const pendingBatches = await getPendingBatchCount(projects);

    return {
        kpis: [
            { title: 'Total Active Projects', value: activeProjects },
            { title: 'Projects In Stability', value: inStability },
            { title: 'Projects In Documentation', value: inDocumentation },
            { title: 'Stopped Projects', value: stoppedProjects }
        ],
        risk: [
            { title: 'Overdue Stability Observations', value: overdueCount },
            { title: 'Pending Batch Decisions', value: pendingBatches }
        ],
        stageDistribution: Object.entries(stageCounts)
            .map(([stage, count]) => ({ stage, count }))
            .sort((a, b) => b.count - a.count),
        alerts: notifications
            .filter((item) => {
                const type = String(item?.type || '').toUpperCase();
                return type === 'OVERDUE' || type === 'REMINDER';
            })
            .slice(0, 6)
            .map((item) => ({
                type: item.type,
                project: item.projectId || '-',
                title: item.title || item.protocolName || 'Stability',
                dueDate: item.dueDate || '-'
            }))
    };
};

const buildManagerData = async (projects, notifications, equipment) => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const pendingBatches = await getPendingBatchCount(projects);

    const dueTodayTasks = notifications.filter((item) => {
        const date = toIsoDate(item?.dueDate);
        return date && date.toISOString().slice(0, 10) === todayKey;
    }).length;

    const calibrationDueThisWeek = equipment.filter((item) => {
        const nextCalibration = toIsoDate(item?.nextCalibration);
        return nextCalibration && nextCalibration >= now && nextCalibration <= weekEnd;
    }).length;

    return {
        kpis: [
            { title: 'My Team Active Projects', value: projects.length },
            { title: 'Pending Approvals', value: pendingBatches },
            { title: 'Due Today Tasks', value: dueTodayTasks },
            { title: 'Calibration Due This Week', value: calibrationDueThisWeek }
        ],
        approvalQueue: [
            { label: 'Pending Batch Decisions', value: pendingBatches },
            {
                label: 'Overdue Stability Follow-ups',
                value: notifications.filter((item) => String(item?.type || '').toUpperCase() === 'OVERDUE').length
            }
        ],
        attentionProjects: projects.slice(0, 8).map((project) => ({
            projectId: project.projectId,
            name: project.projectName || '-',
            stage: project.lifecycleStage || '-',
            status: project.status || '-'
        }))
    };
};

const buildExecutiveData = (notifications, equipment) => {
    const overdue = notifications.filter(
        (item) => String(item?.type || '').toUpperCase() === 'OVERDUE'
    );
    const reminder = notifications.filter(
        (item) => String(item?.type || '').toUpperCase() === 'REMINDER'
    );

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const pendingCalibrations = equipment.filter((item) => {
        const nextCalibration = toIsoDate(item?.nextCalibration);
        return nextCalibration && nextCalibration >= now && nextCalibration <= weekEnd;
    }).length;

    return {
        kpis: [
            { title: 'My Open Tasks', value: overdue.length + reminder.length },
            { title: 'My Overdue Tasks', value: overdue.length },
            { title: 'My Completed This Week', value: 0 },
            { title: 'My Pending Calibrations', value: pendingCalibrations }
        ],
        tasks: notifications.slice(0, 8).map((item) => ({
            type: item.type,
            title: item.message,
            dueDate: item.dueDate,
            project: item.projectId || '-'
        })),
        quickActions: [
            { title: 'Open Project', path: '/projects' },
            { title: 'Log Calibration', path: '/calibration' },
            { title: 'Upload Document', path: '/documents' },
            { title: 'View Audit Trail', path: '/audit/trail' }
        ]
    };
};

export const dashboardService = {
    async getDashboardData(role = 'EXECUTIVE') {
        const normalizedRole = String(role || 'EXECUTIVE').toUpperCase();

        const [projectsPage, benchmarks, notifications, equipment] = await Promise.all([
            safe(projectsService.getPage({ page: 0, size: 500 }), { content: [] }),
            safe(benchmarkService.getAll(), []),
            safe(notificationsService.getAll(), []),
            safe(equipmentService.getAll(), [])
        ]);

        const projects = Array.isArray(projectsPage?.content) ? projectsPage.content : [];
        const safeBenchmarks = Array.isArray(benchmarks) ? benchmarks : [];
        const safeNotifications = Array.isArray(notifications) ? notifications : [];
        const safeEquipment = Array.isArray(equipment) ? equipment : [];

        try {
            if (normalizedRole === 'HEAD') {
                const data = await buildHeadData(projects, safeBenchmarks, safeNotifications);
                return { role: normalizedRole, ...data, usedFallback: false };
            }

            if (normalizedRole === 'MANAGER') {
                const data = await buildManagerData(projects, safeNotifications, safeEquipment);
                return { role: normalizedRole, ...data, usedFallback: false };
            }

            const data = buildExecutiveData(safeNotifications, safeEquipment);
            return { role: normalizedRole, ...data, usedFallback: false };
        } catch {
            if (normalizedRole === 'HEAD') {
                return { role: normalizedRole, ...FALLBACK.head, stageDistribution: [], alerts: [], usedFallback: true };
            }
            if (normalizedRole === 'MANAGER') {
                return { role: normalizedRole, ...FALLBACK.manager, approvalQueue: [], attentionProjects: [], usedFallback: true };
            }
            return { role: normalizedRole, ...FALLBACK.executive, tasks: [], quickActions: [], usedFallback: true };
        }
    }
};
