import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApiKeyOrJwtGuard } from './api-key.guard';
import { ScopeGuard } from './scope.guard';
import { ApiKeysModule } from '../../api-keys/api-keys.module';

@Global()
@Module({
  imports: [
    ApiKeysModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  providers: [ApiKeyOrJwtGuard, ScopeGuard],
  exports: [ApiKeyOrJwtGuard, ScopeGuard, JwtModule],
})
export class GuardsModule {}
