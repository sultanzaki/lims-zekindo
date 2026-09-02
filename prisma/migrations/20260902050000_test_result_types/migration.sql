-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "resultType" TEXT,
ADD COLUMN     "numericMode" TEXT,
ADD COLUMN     "numericLimit" DOUBLE PRECISION,
ADD COLUMN     "numericMin" DOUBLE PRECISION,
ADD COLUMN     "numericMax" DOUBLE PRECISION,
ADD COLUMN     "numericTarget" DOUBLE PRECISION,
ADD COLUMN     "numericTolerance" DOUBLE PRECISION,
ADD COLUMN     "categoricalOptions" TEXT,
ADD COLUMN     "categoricalPassOptions" TEXT,
ADD COLUMN     "categoricalOrdered" BOOLEAN,
ADD COLUMN     "requiresAttachment" BOOLEAN;

-- AlterTable
ALTER TABLE "TestCatalog" ADD COLUMN     "resultType" TEXT,
ADD COLUMN     "numericMode" TEXT,
ADD COLUMN     "numericLimit" DOUBLE PRECISION,
ADD COLUMN     "numericMin" DOUBLE PRECISION,
ADD COLUMN     "numericMax" DOUBLE PRECISION,
ADD COLUMN     "numericTarget" DOUBLE PRECISION,
ADD COLUMN     "numericTolerance" DOUBLE PRECISION,
ADD COLUMN     "categoricalOptions" TEXT,
ADD COLUMN     "categoricalPassOptions" TEXT,
ADD COLUMN     "categoricalOrdered" BOOLEAN,
ADD COLUMN     "requiresAttachment" BOOLEAN;
