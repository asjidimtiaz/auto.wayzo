'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: 'Confirmer',
    message: 'Êtes-vous sûr de vouloir continuer ?',
    type: 'default',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setState({
          isOpen: true,
          title: options.title || 'Confirmer',
          message: options.message || 'Êtes-vous sûr de vouloir continuer ?',
          type: options.type || 'default',
          confirmText: options.confirmText || 'Confirmer',
          cancelText: options.cancelText || 'Annuler',
          loading: false,
          onConfirm: () => {
            setState((s) => ({ ...s, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setState((s) => ({ ...s, isOpen: false }));
            resolve(false);
          },
        });
      }),
    []
  );

  const confirmDelete = useCallback(
    (name) =>
      confirm({
        title: 'Supprimer',
        message: `Êtes-vous sûr de vouloir supprimer ${name ? `"${name}"` : 'cet élément'} ? Cette action est irréversible.`,
        type: 'danger',
        confirmText: 'Supprimer',
      }),
    [confirm]
  );

  const confirmAction = useCallback(
    (message) => confirm({ title: 'Confirmation', message, type: 'warning' }),
    [confirm]
  );

  const setLoading = useCallback((loading) => {
    setState((s) => ({ ...s, loading }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  const value = {
    confirm,
    confirmDelete,
    confirmAction,
    setLoading,
    close,
    dialogProps: {
      isOpen: state.isOpen,
      title: state.title,
      message: state.message,
      type: state.type,
      confirmText: state.confirmText,
      cancelText: state.cancelText,
      loading: state.loading,
      onConfirm: state.onConfirm,
      onClose: state.onCancel,
    },
    isConfirming: state.isOpen,
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog {...value.dialogProps} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
