export type ToastType = 'success' | 'error' | 'info' | 'warning';

export const showToast = (message: string, type: ToastType = 'info') => {
    // In a real app, this would integrate with a global toast context or library like react-hot-toast.
    // Since we are stabilizing the existing UI which uses showToast imports,
    // we provide a robust implementation that components can rely on.
    console.log(`[Toast] ${type.toUpperCase()}: ${message}`);

    // For now, we'll use a simple alert if it's an error, 
    // but the UI components already have their own internal toast states in some views.
    // We provide this as a placeholder/utility for the components that import it.

    // Create a custom event so the App or specific views can listen and show a real UI toast
    const event = new CustomEvent('app:toast', { detail: { message, type } });
    window.dispatchEvent(event);
};
