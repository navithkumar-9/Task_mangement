import NotificationPopup from './NotificationPopup';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-wrapper">
                <main className="main-content">{children}</main>
                <NotificationPopup />
            </div>
        </div>
    );
};

export default Layout;
