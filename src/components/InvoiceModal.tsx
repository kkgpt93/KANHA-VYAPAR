import React from 'react';
import { Invoice } from '../types';
import { PrintPreviewModal } from './PrintPreviewModal';

export interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  return (
    <PrintPreviewModal
      invoice={invoice}
      onClose={onClose}
    />
  );
};
