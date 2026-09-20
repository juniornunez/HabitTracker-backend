import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecordsService } from './records.service';
import { ToggleCompletionDto } from './dto/toggle-completion.dto';

@UseGuards(JwtAuthGuard)
@Controller('habits')
export class RecordsController {
  constructor(private recordsService: RecordsService) {}

  @Post(':id/complete')
  markComplete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ToggleCompletionDto,
  ) {
    return this.recordsService.markComplete(req.user.userId, id, dto.fecha);
  }

  @Delete(':id/complete')
  unmarkComplete(
    @Req() req: any,
    @Param('id') id: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.recordsService.unmarkComplete(req.user.userId, id, fecha);
  }

  @Get(':id/history')
  getHistory(@Req() req: any, @Param('id') id: string) {
    return this.recordsService.getHistory(req.user.userId, id);
  }

  @Get(':id/streak')
  getStreak(@Req() req: any, @Param('id') id: string) {
    return this.recordsService.getStreak(req.user.userId, id);
  }

  @Get(':id/completion-rate')
  getCompletionRate(
    @Req() req: any,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.recordsService.getCompletionRate(
      req.user.userId,
      id,
      days ? parseInt(days, 10) : 7,
    );
  }
}