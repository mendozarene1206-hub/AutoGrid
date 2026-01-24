/**
 * GlobalHeader.tsx
 * 
 * Fixed header with logo, project breadcrumbs, and actions.
 * Based on AutoGrid Design System.
 */

import React from 'react';
import { History, Download, Share2, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface GlobalHeaderProps {
    projectName?: string;
    fileName?: string;
    status: string;
    lastSaved?: string;
    onLockSubmit?: () => void;
    isLocked?: boolean;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
    projectName = 'NYC Midtown Plaza Expansion',
    fileName = 'Est_Phase_01_v4.xlsx',
    status,
    lastSaved = '2m ago',
    onLockSubmit,
    isLocked = false
}) => {
    return (
        <header className="global-header">
            {/* Left: Logo & Breadcrumbs */}
            <div className="header-left">
                <div className="header-logo">
                    <div className="logo-icon">A</div>
                    <span className="logo-text">AUTOGRID</span>
                </div>

                <div className="header-divider" />

                <div className="header-breadcrumbs">
                    <span className="breadcrumb-label">Project:</span>
                    <span className="breadcrumb-value">{projectName}</span>
                    <ChevronRight size={14} className="breadcrumb-arrow" />
                    <span className="breadcrumb-file">{fileName}</span>
                </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="header-right">
                <div className="header-status">
                    <StatusBadge status={status} />
                    <span className="last-saved">Last saved {lastSaved}</span>
                </div>

                <div className="header-divider" />

                <div className="header-actions">
                    <button className="header-icon-btn" title="History">
                        <History size={18} />
                    </button>
                    <button className="header-icon-btn" title="Download">
                        <Download size={18} />
                    </button>
                    <button className="header-icon-btn" title="Share">
                        <Share2 size={18} />
                    </button>

                    <button
                        className={`lock-submit-btn ${isLocked ? 'locked' : ''}`}
                        onClick={onLockSubmit}
                        disabled={isLocked}
                    >
                        {isLocked ? (
                            <>
                                <ShieldCheck size={14} />
                                Digitally Signed
                            </>
                        ) : (
                            <>
                                <Lock size={14} />
                                Lock & Submit
                            </>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default GlobalHeader;
