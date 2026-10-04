import React, { useEffect, useMemo, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Problem, ProblemSeverity } from '../types';
import { SEVERITY_COLORS } from '../constants';

Chart.register(...registerables);

interface ReportDashboardProps {
  problems: Problem[];
  chartRef?: React.RefObject<HTMLCanvasElement>;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ problems, chartRef }) => {
    const internalChartRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = chartRef || internalChartRef;

    const stats = useMemo(() => {
        const severityCounts = {
            [ProblemSeverity.LOW]: 0,
            [ProblemSeverity.MEDIUM]: 0,
            [ProblemSeverity.HIGH]: 0,
            [ProblemSeverity.CRITICAL]: 0,
        };
        problems.forEach(p => {
            severityCounts[p.severity] = (severityCounts[p.severity] || 0) + 1;
        });
        return {
            totalProblems: problems.length,
            severityCounts,
        };
    }, [problems]);

    const chartData = useMemo(() => {
        const labels = Object.values(ProblemSeverity);
        const data = labels.map(label => stats.severityCounts[label]);
        const backgroundColors = labels.map(label => SEVERITY_COLORS[label]?.pdfFill || '#cccccc');
        const borderColors = labels.map(label => SEVERITY_COLORS[label]?.pdfText || '#666666');

        return {
            labels,
            datasets: [{
                label: 'Problems by Severity',
                data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
            }]
        };
    }, [stats.severityCounts]);

    useEffect(() => {
        let chartInstance: Chart | null = null;
        if (canvasRef.current) {
            const existingChart = Chart.getChart(canvasRef.current);
            if (existingChart) {
                existingChart.destroy();
            }

            chartInstance = new Chart(canvasRef.current, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            position: 'right', 
                            labels: { 
                                font: { family: 'Heebo' },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels && data.labels.length && data.datasets.length) {
                                        const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                        originalLabels.forEach(label => {
                                            if (label.index !== undefined) {
                                                const value = data.datasets[0].data[label.index];
                                                label.text = `${label.text}: ${value}`;
                                            }
                                        });
                                        return originalLabels;
                                    }
                                    return [];
                                }
                            } 
                        },
                        title: { display: true, text: 'התפלגות תקלות לפי חומרה', font: { family: 'Heebo', size: 16 } }
                    }
                }
            });
        }
        return () => chartInstance?.destroy();
    }, [chartData, canvasRef]);

    const StatCard = ({ title, value, colorClass }: { title: string, value: number, colorClass: string }) => (
        <div className="bg-white p-3 rounded-lg shadow-sm text-center border">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className={`text-xs font-medium ${colorClass}`}>{title}</p>
        </div>
    );
    
    return (
        <section className="mb-6 p-4 bg-slate-50 rounded-lg shadow-inner border border-slate-200">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <StatCard title="סה״כ תקלות" value={stats.totalProblems} colorClass="text-slate-500" />
                <StatCard title={ProblemSeverity.CRITICAL} value={stats.severityCounts[ProblemSeverity.CRITICAL]} colorClass={SEVERITY_COLORS[ProblemSeverity.CRITICAL].text} />
                <StatCard title={ProblemSeverity.HIGH} value={stats.severityCounts[ProblemSeverity.HIGH]} colorClass={SEVERITY_COLORS[ProblemSeverity.HIGH].text} />
                <StatCard title={ProblemSeverity.MEDIUM} value={stats.severityCounts[ProblemSeverity.MEDIUM]} colorClass={SEVERITY_COLORS[ProblemSeverity.MEDIUM].text} />
                <StatCard title={ProblemSeverity.LOW} value={stats.severityCounts[ProblemSeverity.LOW]} colorClass={SEVERITY_COLORS[ProblemSeverity.LOW].text} />
            </div>
            <div className="bg-white p-2 rounded-lg shadow-sm border">
                <div className="relative h-64">
                    {problems.length > 0 ? <canvas ref={canvasRef}></canvas> : <p className="text-center text-slate-400 pt-24">אין תקלות בדוח זה.</p>}
                </div>
            </div>
        </section>
    );
};

export default ReportDashboard;