import React from 'react';
import { Invoice } from '../types';
import { PrintPreviewModal } from './PrintPreviewModal';

export interface InvoiceModalProps {
  invoice: Invoice | null;
  initialAddItemOpen?: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  initialAddItemOpen = false,
  onClose,
}) => {
  return (
    <PrintPreviewModal
      invoice={invoice}
      initialAddItemOpen={initialAddItemOpen}
      onClose={onClose}
    />
  );
};
