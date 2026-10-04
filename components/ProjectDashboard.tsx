import React, { useEffect, useMemo, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Project, Problem, ProblemSeverity } from '../types';
import { SEVERITY_COLORS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

Chart.register(...registerables);

interface BuildingDashboardProps {
  project: Project;
  problems: Problem[];
}

const BuildingDashboard: React.FC<BuildingDashboardProps> = ({ project, problems }) => {
    const severityChartRef = useRef<HTMLCanvasElement>(null);
    const statusChartRef = useRef<HTMLCanvasElement>(null);
    const { settings } = useSettings();

    const stats = useMemo(() => {
        const openProblems = problems.filter(p => !p.isFixed);
        const severityCounts = {
            [ProblemSeverity.LOW]: 0,
            [ProblemSeverity.MEDIUM]: 0,
            [ProblemSeverity.HIGH]: 0,
            [ProblemSeverity.CRITICAL]: 0,
        };
        openProblems.forEach(p => {
            severityCounts[p.severity] = (severityCounts[p.severity] || 0) + 1;
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const notificationDateLimit = new Date();
        notificationDateLimit.setDate(today.getDate() + (settings.notificationDays || 7));

        const expiredFiles = (project.files || []).filter(file =>
            file.dueDate && new Date(file.dueDate) < today
        ).length;
        
        const dueSoonFiles = (project.files || []).filter(file => {
            if (!file.dueDate) return false;
            const dueDate = new Date(file.dueDate);
            return dueDate >= today && dueDate <= notificationDateLimit;
        }).length;

        const expiredTodos = (project.todos || []).filter(todo =>
            !todo.isCompleted && todo.dueDate && new Date(todo.dueDate) < today
        ).length;

        const dueSoonTodos = (project.todos || []).filter(todo => {
            if (todo.isCompleted || !todo.dueDate) return false;
            const dueDate = new Date(todo.dueDate);
            return dueDate >= today && dueDate <= notificationDateLimit;
        }).length;

        let expiredPermits = 0;
        let dueSoonPermits = 0;
        (project.workers || []).forEach(w => {
            const permits = [w.safetyPermit, w.workAtHeightPermit, ...w.licenses.map(l => l.file)];
            permits.forEach(p => {
                if (p?.validUntil) {
                    const dueDate = new Date(p.validUntil);
                    if (dueDate < today) expiredPermits++;
                    else if (dueDate <= notificationDateLimit) dueSoonPermits++;
                }
            });
        });

        let expiredWarranties = 0;
        let dueSoonWarranties = 0;
        (project.inventory || []).forEach(l => l.itemGroups.forEach(g => g.items.forEach(i => {
            if (i.warrantyEndDate) {
                const dueDate = new Date(i.warrantyEndDate);
                if (dueDate < today) expiredWarranties++;
                else if (dueDate <= notificationDateLimit) dueSoonWarranties++;
            }
        })));


        return {
            totalProblems: problems.length,
            openProblems: openProblems.length,
            fixedProblems: problems.length - openProblems.length,
            openCritical: severityCounts[ProblemSeverity.CRITICAL],
            severityCounts,
            expiredFiles,
            expiredTodos,
            dueSoonFiles,
            dueSoonTodos,
            expiredPermits,
            dueSoonPermits,
            expiredWarranties,
            dueSoonWarranties,
        };
    }, [problems, project, settings.notificationDays]);

    const severityChartData = useMemo(() => {
        const labels = Object.values(ProblemSeverity);
        const data = labels.map(label => stats.severityCounts[label]);
        const backgroundColors = labels.map(label => SEVERITY_COLORS[label]?.pdfFill || '#cccccc');
        const borderColors = labels.map(label => SEVERITY_COLORS[label]?.pdfText || '#666666');
        
        return {
            labels,
            datasets: [{
                label: 'Open Problems by Severity',
                data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
            }]
        };
    }, [stats.severityCounts]);

    const statusChartData = useMemo(() => {
        const labels = ['טופלו', 'פתוחות'];
        const data = [stats.fixedProblems, stats.openProblems];
        const backgroundColor = ['#22c55e', '#f59e0b'];
        
        return {
            labels,
            datasets: [{
                label: 'Problems by Status',
                data,
                backgroundColor,
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [stats.fixedProblems, stats.openProblems]);


    useEffect(() => {
        let chartInstance: Chart | null = null;
        if (severityChartRef.current) {
            chartInstance = new Chart(severityChartRef.current, {
                type: 'doughnut',
                data: severityChartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'right', labels: { font: { family: 'Heebo' } } },
                        title: { display: true, text: 'תקלות פתוחות לפי חומרה', font: { family: 'Heebo', size: 14 } }
                    }
                }
            });
        }
        return () => chartInstance?.destroy();
    }, [severityChartData]);

    useEffect(() => {
        let chartInstance: Chart | null = null;
        if (statusChartRef.current) {
            chartInstance = new Chart(statusChartRef.current, {
                type: 'pie',
                data: statusChartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'right', labels: { font: { family: 'Heebo' } } },
                        title: { display: true, text: 'סטטוס תקלות כללי', font: { family: 'Heebo', size: 14 } }
                    }
                }
            });
        }
        return () => chartInstance?.destroy();
    }, [statusChartData]);

    const StatCard = ({ title, value, colorClass }: { title: string, value: number, colorClass: string }) => (
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className={`text-xs font-medium ${colorClass}`}>{title}</p>
        </div>
    );
    
    return (
        <section className="mb-6 p-4 bg-slate-50 rounded-lg shadow-inner border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-700 mb-4">סיכום בניין</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard title="סה״כ תקלות" value={stats.totalProblems} colorClass="text-slate-500" />
                <StatCard title="תקלות פתוחות" value={stats.openProblems} colorClass="text-amber-500" />
                <StatCard title="תקלות קריטיות פתוחות" value={stats.openCritical} colorClass="text-red-500" />
                <StatCard title="תקלות שטופלו" value={stats.fixedProblems} colorClass="text-green-500" />
                <StatCard title="קבצים שפג תוקפם" value={stats.expiredFiles} colorClass="text-orange-500" />
                <StatCard title="משימות שפג תוקפן" value={stats.expiredTodos} colorClass="text-orange-500" />
                <StatCard title="היתרים שפג תוקפם" value={stats.expiredPermits} colorClass="text-orange-500" />
                <StatCard title="אחריות שפג תוקפה" value={stats.expiredWarranties} colorClass="text-orange-500" />
                <StatCard title="קבצים לקראת תפוגה" value={stats.dueSoonFiles} colorClass="text-purple-500" />
                <StatCard title="משימות לקראת תפוגה" value={stats.dueSoonTodos} colorClass="text-purple-500" />
                <StatCard title="היתרים לקראת תפוגה" value={stats.dueSoonPermits} colorClass="text-purple-500" />
                <StatCard title="אחריות לקראת תפוגה" value={stats.dueSoonWarranties} colorClass="text-purple-500" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-2 rounded-lg shadow-sm border">
                    <div className="relative h-60">
                        {stats.openProblems > 0 ? <canvas ref={severityChartRef}></canvas> : <p className="text-center text-slate-400 pt-24">אין תקלות פתוחות.</p>}
                    </div>
                </div>
                 <div className="bg-white p-2 rounded-lg shadow-sm border">
                    <div className="relative h-60">
                         {stats.totalProblems > 0 ? <canvas ref={statusChartRef}></canvas> : <p className="text-center text-slate-400 pt-24">אין תקלות.</p>}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BuildingDashboard;