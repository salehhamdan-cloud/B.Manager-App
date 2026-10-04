import React, { useState, useEffect, useCallback } from 'react';
import { Project, GlobalDashboardStats } from '../types';
import * as dbService from '../services/dbService';
import Dashboard from '../components/Dashboard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

const DashboardPage: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [dashboardStats, setDashboardStats] = useState<GlobalDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { addToast } = useToast();

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectsData, statsData] = await Promise.all([
                dbService.getAllProjects(),
                dbService.getGlobalDashboardStats(),
            ]);
            setProjects(projectsData);
            setDashboardStats(statsData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            addToast('שגיאה בטעינת נתונים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    if (isLoading || !dashboardStats) {
        return <LoadingSpinner text="טוען נתונים..." />;
    }

    return (
        <div className="animate-fadeInUp">
            <Dashboard stats={dashboardStats} projects={projects} className="mb-8" />
        </div>
    );
};

export default DashboardPage;