import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmController {
  constructor(private readonly service: CrmService) {}

  @Get('overview')
  overview(@CurrentUser() u: any) {
    return this.service.getOverview(u);
  }

  @Get('analytics')
  analytics(@CurrentUser() u: any) {
    return this.service.getAnalytics(u);
  }

  @Get('interactions')
  interactions(@CurrentUser() u: any, @Query() q: any) {
    return this.service.findAllInteractions(u, q);
  }

  @Get('documents')
  documents(@CurrentUser() u: any, @Query() q: any) {
    return this.service.findAllDocuments(u, q);
  }

  @Get('notes')
  notes(@CurrentUser() u: any, @Query() q: any) {
    return this.service.findAllNotes(u, q);
  }
}
