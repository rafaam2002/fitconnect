import { ReportService } from '../../services/report.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import { statsPermissions } from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

// ===== QUERY RESOLVERS ========

const getReportMetrics = async (_: any, args: any, context: ContextProps) => {
  try {
    const { em, currentUser } = context;
    const reportService = new ReportService();
    return await reportService.getReportMetrics(em, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

export const reportResolvers = {
  Query: {
    getReportMetrics: withPermissions(statsPermissions.READ, getReportMetrics),
  },
};
