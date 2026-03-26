import api from './api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type LabelType = 'qr' | 'code128' | 'code39' | 'ean13';

export type LabelSize = 'small' | 'medium' | 'large';

export interface LabelTemplate {
  id: number;
  name: string;
  description: string | null;
  label_type: LabelType;
  size: LabelSize;
  width_mm: number;
  height_mm: number;
  include_product_name: boolean;
  include_sku: boolean;
  include_barcode: boolean;
  include_location: boolean;
  include_batch: boolean;
  include_expiration: boolean;
  qr_size: number;
  barcode_height: number;
  font_name: string;
  font_size: number;
  show_border: boolean;
  border_width: number;
  background_color: string;
  text_color: string;
  is_active: boolean;
  is_default: boolean;
}

export interface LabelData {
  product_id?: number;
  product_name?: string;
  sku?: string;
  barcode?: string;
  location_code?: string;
  location_name?: string;
  batch_number?: string;
  expiration_date?: string;
  custom_text?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  label_type?: LabelType;
  size?: LabelSize;
  width_mm?: number;
  height_mm?: number;
  include_product_name?: boolean;
  include_sku?: boolean;
  include_barcode?: boolean;
  include_location?: boolean;
  include_batch?: boolean;
  include_expiration?: boolean;
  qr_size?: number;
  barcode_height?: number;
  font_name?: string;
  font_size?: number;
  show_border?: boolean;
  border_width?: number;
  background_color?: string;
  text_color?: string;
}

export const labelService = {
  listTemplates: async (): Promise<LabelTemplate[]> => {
    const response = await api.get<LabelTemplate[]>('/inventory/labels/templates');
    return response.data;
  },

  getTemplate: async (templateId: number): Promise<LabelTemplate> => {
    const response = await api.get<LabelTemplate>(`/inventory/labels/templates/${templateId}`);
    return response.data;
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<LabelTemplate> => {
    const response = await api.post<LabelTemplate>('/inventory/labels/templates', data);
    return response.data;
  },

  updateTemplate: async (templateId: number, data: Partial<CreateTemplateRequest>): Promise<LabelTemplate> => {
    const response = await api.put<LabelTemplate>(`/inventory/labels/templates/${templateId}`, data);
    return response.data;
  },

  deleteTemplate: async (templateId: number): Promise<void> => {
    await api.delete(`/inventory/labels/templates/${templateId}`);
  },

  generateProductLabelUrl: (productId: number, templateId?: number, labelType?: LabelType): string => {
    const baseUrl = api.defaults.baseURL || '';
    let url = `${baseUrl}/inventory/labels/product/${productId}`;
    const params = [];
    if (templateId) params.push(`template_id=${templateId}`);
    if (labelType) params.push(`label_type=${labelType}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return url;
  },

  generateLocationLabelUrl: (locationId: number, templateId?: number, labelType?: LabelType): string => {
    const baseUrl = api.defaults.baseURL || '';
    let url = `${baseUrl}/inventory/labels/location/${locationId}`;
    const params = [];
    if (templateId) params.push(`template_id=${templateId}`);
    if (labelType) params.push(`label_type=${labelType}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return url;
  },

  generateCustomLabel: async (data: LabelData, templateId?: number, labelType?: LabelType): Promise<Blob> => {
    const response = await api.post('/inventory/labels/generate', {
      data,
      template_id: templateId,
      label_type: labelType,
    }, {
      responseType: 'blob',
    });
    return response.data;
  },

  printPdf: async (pdfUri: string): Promise<void> => {
    await Print.printAsync({ uri: pdfUri });
  },

  printFromUrl: async (url: string): Promise<void> => {
    await Print.printAsync({ uri: url });
  },

  sharePdf: async (pdfUri: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir Etiqueta',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  },

  printHtml: async (html: string): Promise<void> => {
    await Print.printAsync({ html });
  },
};

export default labelService;
