import { Controller, Get, Req } from '@nestjs/common';
import { RequireScope } from '../common/decorators/require-scope.decorator';

@Controller('api-keys-test')
export class ApiKeysTestController {
  // Route de test — protégée uniquement par le guard global
  @Get('whoami')
  @RequireScope('READ')
  whoami(@Req() req: any) {
    return {
      mode: req.apiContext ? 'API_KEY' : 'JWT',
      organizationId: req.user?.organizationId,
      scopes: req.user?.scopes || 'n/a',
      apiKeyId: req.apiContext?.apiKeyId || null,
      timestamp: new Date().toISOString(),
    };
  }
}
