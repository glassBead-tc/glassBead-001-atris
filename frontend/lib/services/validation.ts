import { createClient } from '@supabase/supabase-js';
import { 
  DocumentValidation,
  ValidationEvent,
  DocumentChange,
  ValidationMethod,
  DocumentSource,
  DocumentValidationSchema
} from '../../types/validation.js';
import { AudiusDocument } from '../../types/documents.js';

export class DocumentValidationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Validates a document against current protocol specifications
   */
  async validateDocument(document: AudiusDocument): Promise<ValidationEvent> {
    // TODO: Implement API spec validation logic
    const validationEvent: ValidationEvent = {
      timestamp: new Date(),
      method: ValidationMethod.API_SPEC_VALIDATION,
      validator: 'system',
      confidence_score: 0.9, // Default high confidence for API validation
      validation_notes: 'Automated validation against current API specifications'
    };

    await this.recordValidationEvent(document.id, validationEvent);
    return validationEvent;
  }

  /**
   * Records a validation event for a document
   */
  private async recordValidationEvent(documentId: string, event: ValidationEvent) {
    const { error } = await this.supabase
      .from('document_validations')
      .insert({
        document_id: documentId,
        validation_event: event
      });

    if (error) throw error;
  }

  /**
   * Records a change to a document
   */
  async recordDocumentChange(documentId: string, change: DocumentChange) {
    const { error } = await this.supabase
      .from('document_changes')
      .insert({
        document_id: documentId,
        change_event: change
      });

    if (error) throw error;
  }

  /**
   * Updates protocol compatibility information for a document
   */
  async updateProtocolCompatibility(documentId: string, compatibility: DocumentValidation['protocol_compatibility']) {
    const { error } = await this.supabase
      .from('documents')
      .update({
        protocol_compatibility: compatibility
      })
      .eq('id', documentId);

    if (error) throw error;
  }

  /**
   * Checks if a document is valid for a specific protocol version
   */
  async isValidForVersion(documentId: string, version: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('protocol_compatibility')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    if (!data) return { isValid: false, reason: 'Document not found' };

    const compatibility = data.protocol_compatibility;
    
    // Check version compatibility
    if (version < compatibility.min_version) {
      return {
        isValid: false,
        reason: `Document requires minimum version ${compatibility.min_version}`
      };
    }

    if (compatibility.max_version && version > compatibility.max_version) {
      return {
        isValid: false,
        reason: `Document is only valid up to version ${compatibility.max_version}`
      };
    }

    // Check for deprecation
    if (compatibility.deprecation_notice) {
      return {
        isValid: true,
        reason: `Warning: Deprecated since ${compatibility.deprecation_notice.deprecated_since}`
      };
    }

    return { isValid: true };
  }

  /**
   * Gets the full validation history for a document
   */
  async getValidationHistory(documentId: string): Promise<ValidationEvent[]> {
    const { data, error } = await this.supabase
      .from('document_validations')
      .select('validation_event')
      .eq('document_id', documentId)
      .order('validation_event->timestamp', { ascending: false });

    if (error) throw error;
    return data?.map(d => d.validation_event) || [];
  }

  /**
   * Calculates an aggregate confidence score based on validation history
   */
  async calculateConfidenceScore(documentId: string): Promise<number> {
    const history = await this.getValidationHistory(documentId);
    if (!history.length) return 0;

    // Weight recent validations more heavily
    const weightedScores = history.map((event, index) => {
      const age = (Date.now() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24); // age in days
      const weight = Math.exp(-age / 30); // exponential decay with 30-day half-life
      return event.confidence_score * weight;
    });

    const totalWeight = weightedScores.reduce((sum, score) => sum + score, 0);
    const weightSum = weightedScores.length;

    return totalWeight / weightSum;
  }

  /**
   * Updates governance references for a document
   */
  async updateGovernanceReferences(
    documentId: string,
    references: DocumentValidation['governance_references']
  ) {
    const { error } = await this.supabase
      .from('documents')
      .update({
        governance_references: references
      })
      .eq('id', documentId);

    if (error) throw error;
  }
}
