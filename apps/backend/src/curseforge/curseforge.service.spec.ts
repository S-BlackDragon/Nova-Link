import { Test, TestingModule } from '@nestjs/testing';
import { CurseforgeService } from './curseforge.service';

describe('CurseforgeService', () => {
  let service: CurseforgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurseforgeService],
    }).compile();

    service = module.get<CurseforgeService>(CurseforgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
