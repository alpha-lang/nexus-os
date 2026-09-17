import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.service.findAll(req.user, { cursor, take, search, role });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user);
  }
}
