import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get()
  getStatistics(@Req() req: any) {
    return this.statisticsService.getStatistics(req.user.userId);
  }
}